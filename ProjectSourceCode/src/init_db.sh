!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://loconotion_db_user:8ch33StU86sO9YCP4Mz3Zqt4F13iW3dw@dpg-d7glgu9kh4rs739buuq0-a.oregon-postgres.render.com/loconotion_db"

# Execute each .sql file in the directory
for file in init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done