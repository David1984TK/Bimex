#!/bin/bash
# Bimex Indexer - Backup Script
# Exports proyectos, aportaciones, and eventos tables to JSON files with timestamp

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# Validate required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_KEY must be set in .env"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "🔄 Starting Bimex backup at $(date)"
echo "📁 Backup location: $BACKUP_PATH"

# Extract project ID from Supabase URL
PROJECT_ID=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

# Function to export table using Supabase REST API
export_table() {
  local table=$1
  local output_file="$BACKUP_PATH/${table}.json"
  
  echo "📊 Exporting table: $table"
  
  curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/${table}?select=*" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -o "$output_file"
  
  if [ $? -eq 0 ]; then
    local count=$(jq '. | length' "$output_file" 2>/dev/null || echo "?")
    echo "✅ Exported $count records from $table"
  else
    echo "❌ Failed to export $table"
    return 1
  fi
}

# Export all tables
export_table "proyectos"
export_table "aportaciones"
export_table "eventos"

# Create metadata file
cat > "$BACKUP_PATH/metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "supabase_url": "$SUPABASE_URL",
  "contract_id": "$CONTRACT_ID",
  "tables": ["proyectos", "aportaciones", "eventos"]
}
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo ""
echo "✅ Backup completed successfully"
echo "📦 Total size: $BACKUP_SIZE"
echo "📁 Location: $BACKUP_PATH"

# Optional: Keep only last N backups (uncomment to enable)
# MAX_BACKUPS=7
# cd "$BACKUP_DIR" && ls -t | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -rf

# Optional: Compress backup (uncomment to enable)
# echo "🗜️  Compressing backup..."
# tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
# rm -rf "$BACKUP_PATH"
# echo "✅ Compressed to $BACKUP_PATH.tar.gz"

echo ""
echo "💡 To restore this backup, run:"
echo "   node scripts/restore.js $TIMESTAMP"
