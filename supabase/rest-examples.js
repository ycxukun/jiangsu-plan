// Supabase REST API 接入示例。
// 这不是独立运行文件，后续可以把这些函数合进 app.js。

async function apiFetch(path, options = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });

  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function createStudent(input) {
  const rows = await apiFetch('students', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_id: auth.user.id,
      name: input.name,
      phone: input.phone || null,
      province: input.province || '江苏',
      stage: input.stage || 'undergraduate',
      subject_type: input.subject_type || 'physics',
      score: input.score ? Number(input.score) : null,
      rank: input.rank ? Number(input.rank) : null,
      target_cities: input.target_cities || [],
      target_majors: input.target_majors || [],
      medical_codes: input.medical_codes || [],
      note: input.note || null
    })
  });

  return rows[0];
}

async function createVolunteerForm(student, title = '默认志愿表') {
  const rows = await apiFetch('volunteer_forms', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      student_id: student.id,
      owner_id: auth.user.id,
      title,
      stage: student.stage,
      source_version: VERSION,
      max_group_count: VOLUNTEER_LIMIT
    })
  });

  return rows[0];
}

async function saveCurrentVolunteerGroups(formId) {
  const rows = [];

  volunteerKeys.forEach((key, index) => {
    const rec = getGroupRecord(key);
    if (!rec) return;
    const { s, g } = rec;
    const meta = volunteerMeta[key] || {};

    rows.push({
      form_id: formId,
      owner_id: auth.user.id,
      position: index + 1,
      group_key: key,
      school_name: s.name,
      school_code: s.schoolCode || null,
      province: s.province || null,
      city: s.city || null,
      batch: s.batch || null,
      subject: s.subject || null,
      group_name: g.groupName,
      group_code: g.groupCode || null,
      group_alias: groupDisplayName(s, g) || null,
      requirement: g.requirement || null,
      plan26: g.plan26 || null,
      plan25: g.plan25 || null,
      score25: g.score25 || null,
      rank25: g.rank25 || null,
      strategy: meta.strategy || '待定',
      obey_adjustment: true,
      note: meta.note || null,
      source_payload: { group: g }
    });
  });

  return apiFetch('volunteer_form_groups?on_conflict=form_id,group_key', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(rows)
  });
}

async function saveCurrentVolunteerMajors(savedGroups) {
  const dbGroupByKey = new Map(savedGroups.map((row) => [row.group_key, row]));
  const rows = [];

  volunteerKeys.forEach((groupKey) => {
    const rec = getGroupRecord(groupKey);
    const dbGroup = dbGroupByKey.get(groupKey);
    if (!rec || !dbGroup) return;

    const majorByKey = new Map((rec.g.majors || []).map((m) => [m.key, m]));
    selectedMajorOrder(groupKey).forEach((majorKey, index) => {
      const m = majorByKey.get(majorKey);
      if (!m) return;

      rows.push({
        form_group_id: dbGroup.id,
        owner_id: auth.user.id,
        position: index + 1,
        major_key: majorKey,
        major_code: m.code || null,
        major_name: m.name,
        major_class: m.majorClass || null,
        discipline: m.discipline || null,
        plan26: m.plan26 || null,
        plan25: m.plan25 || null,
        score25: m.score25 || null,
        rank25: m.rank25 || null,
        avg_score3: m.avgScore3 || null,
        avg_rank3: m.avgRank3 || null,
        source_payload: { major: m }
      });
    });
  });

  return apiFetch('volunteer_form_majors?on_conflict=form_group_id,major_key', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(rows)
  });
}

async function saveCurrentVolunteerFormForStudent(student) {
  const form = await createVolunteerForm(student);
  const savedGroups = await saveCurrentVolunteerGroups(form.id);
  await saveCurrentVolunteerMajors(savedGroups);
  return form;
}

async function logVolunteerExport(form, student) {
  return apiFetch('volunteer_exports', {
    method: 'POST',
    body: JSON.stringify({
      form_id: form.id,
      student_id: student.id,
      owner_id: auth.user.id,
      format: 'xls',
      file_name: `江苏志愿基础表_${localDateStamp()}.xls`,
      group_count: volunteerKeys.length,
      major_count: Object.values(volunteerMajorKeys).reduce(
        (sum, keys) => sum + (Array.isArray(keys) ? keys.length : 0),
        0
      )
    })
  });
}
