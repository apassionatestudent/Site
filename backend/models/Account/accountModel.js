// => public/models/Account/accountModel.js
// => Read + write queries for the student Account Settings page.
// => First WRITE-capable model on the student side - every other student
//    model up to now (Enrollments, Documents, Classes) is read-only.
// => Read functions receive `pool` directly, write functions receive
//    `client` so they can participate in a transaction - same convention
//    as sharedEnrollmentModel.js / tesdaEnrollmentModel.js.

// GET ACCOUNT (PROFILE + ADDRESS, COMBINED)
// => LEFT JOIN on student_address since a row should always exist post-
//    enrollment, but LEFT JOIN keeps this safe against any historical gap
export const getAccountByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT
        sp.first_name,
        sp.middle_name,
        sp.last_name,
        sp.name_extension,
        sp.birth_date,
        sp.sex,
        sp.civil_status,
        sp.nationality,
        sp.birthplace_region,
        sp.birthplace_province,
        sp.birthplace_city,
        sp.employment_status,
        sp.highest_educ_attainment,
        sp.religion,
        sp.religion_others,
        sp.contact_no,
        sp.facebook_link,
        sp.email,
        acct.is_night_mode,
        sa.street,
        sa.barangay_code,
        sa.city_code,
        sa.province_code,
        sa.district_code,
        sa.region_code
      FROM student_profile sp
      LEFT JOIN student_address sa ON sa.student_id = sp.student_id
      -- => Needed to pull is_night_mode - LEFT JOIN, not INNER, in case a
      -- => profile row somehow exists without a matching account row yet
      LEFT JOIN student_accounts acct ON acct.student_id = sp.student_id
      WHERE sp.student_id = $1`,
    [studentId]
  );
  return result.rows[0] ?? null;
};

// UPDATE PROFILE CONTACT FIELDS
// => Only the fields allowed to be self-edited - name/birth/etc. stay
//    locked since they're tied to the submitted PSA birth certificate
export const updateProfileContact = async (client, studentId, { email, contactNo, facebookLink }) => {
  await client.query(
    `UPDATE student_profile
        SET email = $1,
            contact_no = $2,
            facebook_link = $3
      WHERE student_id = $4`,
    [email, contactNo, facebookLink, studentId]
  );
};

// UPSERT ADDRESS
// => student_address.student_id carries a UNIQUE constraint, so ON CONFLICT
//    works cleanly whether or not a row already exists for this student
export const upsertAddress = async (client, studentId, { street, barangay, city, province, district, region }) => {
  await client.query(
    `INSERT INTO student_address
        (student_id, street, barangay_code, city_code, province_code, district_code, region_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (student_id) DO UPDATE
        SET street = EXCLUDED.street,
            barangay_code = EXCLUDED.barangay_code,
            city_code = EXCLUDED.city_code,
            province_code = EXCLUDED.province_code,
            district_code = EXCLUDED.district_code,
            region_code = EXCLUDED.region_code`,
    [
      studentId,
      street,
      barangay,
      city,
      // => node-postgres throws on literal undefined - coerce optional
      //    fields to null explicitly
      province || null,
      district || null,
      region,
    ]
  );
};

// GET PASSWORD HASH
// => Used by the password-change flow to verify the current password
//    before allowing a new one to be set
export const getPasswordHashByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT password_hash FROM student_accounts WHERE student_id = $1`,
    [studentId]
  );
  return result.rows[0]?.password_hash ?? null;
};

// UPDATE PASSWORD
// => Single-table write, no transaction needed here - the transaction in
//    accountServices.js is only for the combined profile+address save
export const updatePassword = async (pool, studentId, newPasswordHash) => {
  await pool.query(
    `UPDATE student_accounts SET password_hash = $1 WHERE student_id = $2`,
    [newPasswordHash, studentId]
  );
};

// UPDATE NIGHT MODE PREFERENCE
// => Single-table write, no transaction needed, same reasoning as updatePassword
export const updateNightMode = async (pool, studentId, isNightMode) => {
  await pool.query(
    `UPDATE student_accounts SET is_night_mode = $1 WHERE student_id = $2`,
    [isNightMode, studentId]
  );
};
