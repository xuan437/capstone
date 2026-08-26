const fs = require('fs');
const content = fs.readFileSync('src/supabase.ts', 'utf8');
const urlMatch = content.match(/createClient\(['"]([^'"]+)['"]/);
const keyMatch = content.match(/createClient\([^,]+,\s*['"]([^'"]+)['"]/);
if (urlMatch && keyMatch) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.from('students').select('*').limit(1).then(({ data, error }) => {
    if (error) console.error(error);
    else console.log('Columns:', Object.keys(data[0] || {}));
    if (data[0] && data[0].photo_url) console.log('photo_url length:', data[0].photo_url.length);
  });
}
