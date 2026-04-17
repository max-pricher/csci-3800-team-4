#!/bin/bash
# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private
# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://loconotion_db_szkq_user:LPQKFLhMikxCrA16PjA2RAAadZfQyfEX@dpg-d7h1c7pkh4rs73agmsqg-a.oregon-postgres.render.com/loconotion_db_szkq"
# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
