// Setup script to initialize Supabase database
// Run with: node scripts/setup-database.js

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

async function setupDatabase() {
  console.log("🚀 Supabase Database Setup Helper\n");

  // Read the schema SQL file
  const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    console.error("❌ Schema file not found:", schemaPath);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  console.log("📄 Schema file loaded (" + schemaSql.length + " characters)\n");

  // Copy SQL to clipboard (Windows)
  const clipboardCmd =
    process.platform === "win32"
      ? "clip"
      : process.platform === "darwin"
      ? "pbcopy"
      : "xclip -selection clipboard";

  try {
    const clipProcess = require("child_process").spawn(
      clipboardCmd.split(" ")[0],
      clipboardCmd.split(" ").slice(1),
      {
        stdio: ["pipe", "inherit", "inherit"],
        shell: true,
      }
    );
    clipProcess.stdin.write(schemaSql);
    clipProcess.stdin.end();

    console.log("✅ SQL copied to clipboard!\n");
  } catch (e) {
    console.log("⚠️  Could not copy to clipboard automatically.\n");
  }

  // Open Supabase SQL Editor
  const supabaseUrl =
    "https://supabase.com/dashboard/project/xawqdkzvtrznjotqtwme/sql/new";

  console.log("📋 Next Steps:");
  console.log("   1. Opening Supabase SQL Editor in your browser...");
  console.log("   2. Paste the SQL (Ctrl+V) in the editor");
  console.log('   3. Click "Run" to execute\n');

  // Open browser
  const openCmd =
    process.platform === "win32"
      ? `start "" "${supabaseUrl}"`
      : process.platform === "darwin"
      ? `open "${supabaseUrl}"`
      : `xdg-open "${supabaseUrl}"`;

  exec(openCmd, (error) => {
    if (error) {
      console.log("🌐 Open this URL manually:");
      console.log("   " + supabaseUrl + "\n");
    } else {
      console.log("🌐 Browser opened!\n");
    }

    console.log("After running the SQL, you can login with:");
    console.log("   Username: administrator");
    console.log("   Password: Welcome@123\n");
  });
}

setupDatabase();
