#!/bin/bash
# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private
# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://exampleuser:0QgLdbjYNocXAyWVG3Mq5LSI1g2EcZPa@dpg-d7gms7hj2pic738p4lvg-a.oregon-postgres.render.com/loconotion_db_ers1"
# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
