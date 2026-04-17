#!/bin/bash
# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private
# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://user_db_t4hm_user:kn6Gg2Z2K9LJIfukK9WJTIfOxeB6RbJ3@dpg-d7h17t3eo5us739mh8h0-a.oregon-postgres.render.com/user_db_t4hm"
# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
