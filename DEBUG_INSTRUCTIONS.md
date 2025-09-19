# Debug Instructions untuk Team Assignment dan Progress Issues

## Masalah yang Sedang Diselidiki:
1. **Team data tidak tersimpan ke database** - Data hilang setelah reload
2. **Progress selalu 0%** - Meskipun sudah edit mode

## Langkah Testing:

### 1. Test Team Assignment:
1. Buka browser developer tools (F12)
2. Buka tab Console
3. Edit sebuah proyek
4. Tambah/pilih anggota tim
5. Save proyek
6. Perhatikan log di console:

#### Log yang Diharapkan:
```
=== FORM SUBMIT DEBUG ===
Form Mode: edit
Form Data: {id: "xxx", team: [...], ...}
Team Data: [array of team members]
Team Count: [number > 0]
Sanitized Data: {team: [...], ...}
Sanitized Team: [same array]
=== UPDATING TEAM ASSIGNMENTS ===
Project ID: xxx
Team to save: [array of team members]
Team count: [number > 0]
=== UPSERT ASSIGNMENTS DEBUG ===
Project ID: xxx
Assignments: [array of assignments]
Assignment count: [number > 0]
Existing assignments deleted
Rows to insert: [array of database rows]
New assignments inserted successfully
Team assignments updated successfully
```

#### Jika Ada Masalah:
- **Team Count: 0** → Form data tidak ter-load dengan benar
- **Sanitized Team: []** → Issue di sanitizeProjectData function  
- **Assignment count: 0** → Data hilang di proses sanitization
- **Insert error** → Database error, check permission/schema

### 2. Test Progress Issue:
1. Cek field `progress` di database
2. Lihat apakah ada logika auto-calculation progress
3. Progress mungkin perlu di-update manual atau berdasarkan sub-status completion

### 3. Manual Database Check:
```sql
-- Check if team assignments are actually saved
SELECT * FROM project_team WHERE project_id = 'YOUR_PROJECT_ID';

-- Check project progress field  
SELECT id, project_name, progress FROM projects WHERE id = 'YOUR_PROJECT_ID';
```

## Kemungkinan Masalah:

### Team Assignment:
1. ✅ **sanitizeProjectData** - Fixed: team field now preserved
2. ❓ **Form data loading** - Check if edit mode loads team correctly  
3. ❓ **Database permissions** - Check if upsert operation has proper permissions
4. ❓ **Real-time subscription** - Check if data syncs after save

### Progress:
1. ❓ **Progress calculation** - No auto-calculation logic found
2. ❓ **Progress field in form** - Not included in edit form
3. ❓ **Progress based on sub-status** - Manual calculation needed

## Next Steps:
1. Run test dengan console logs terbuka
2. Copy paste logs yang muncul
3. Check database manually 
4. Tentukan root cause dari logs