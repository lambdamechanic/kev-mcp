#!/bin/bash

# Fix imports in all TypeScript files
find ./src -name "*.ts" -type f -exec sed -i '' 's|from "../utils"|from "../utils.js"|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|from "../types"|from "../types.js"|g' {} \;

# Fix TypeScript 'any' errors by adding type annotations
find ./src -name "*.ts" -type f -exec sed -i '' 's|find(v =>|find((v: any) =>|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|filter(v =>|filter((v: any) =>|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|map((v) =>|map((v: any) =>|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|forEach(vuln =|forEach((vuln: any) =|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|forEach(cwe =|forEach((cwe: any) =|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|reduce((acc, vuln) =>|reduce((acc: any, vuln: any) =>|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|sort((a, b) =>|sort((a: any, b: any) =>|g' {} \;
find ./src -name "*.ts" -type f -exec sed -i '' 's|some(cwe =|some((cwe: any) =|g' {} \;