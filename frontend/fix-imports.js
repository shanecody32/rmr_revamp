const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

// Function to recursively get all TypeScript files
function getTypeScriptFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
            fileList = getTypeScriptFiles(filePath, fileList);
        } else if (
            stat.isFile() &&
            (file.endsWith('.ts') || file.endsWith('.tsx')) &&
            !file.endsWith('.d.ts')
        ) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Function to fix import statements
function fixImportStatements(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: Missing 'import' keyword at the beginning of a line followed by identifiers and 'from'
    // Example: " SomeComponent, AnotherComponent  'some-package';"
    const missingImportRegex = /^(\s*)([A-Za-z0-9_,\s{}]+)\s+'([^']+)';/gm;
    content = content.replace(missingImportRegex, (match, space, identifiers, source) => {
        modified = true;
        // Clean up identifiers (remove extra spaces, handle underscores)
        const cleanedIdentifiers = identifiers
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ')
            .replace(/_([A-Za-z0-9]+)/g, '$1')
            .trim();

        // Check if it's a destructured import or a default import
        if (cleanedIdentifiers.includes(',') || cleanedIdentifiers.includes('{')) {
            // If it already has curly braces, keep them
            if (cleanedIdentifiers.includes('{')) {
                return `${space}import ${cleanedIdentifiers} from '${source}';`;
            }
            // Otherwise, add curly braces for multiple imports
            return `${space}import { ${cleanedIdentifiers} } from '${source}';`;
        } else {
            // Single import without destructuring
            return `${space}import ${cleanedIdentifiers} from '${source}';`;
        }
    });

    // Pattern 2: Missing 'from' keyword in import statements
    // Example: "import { Component } 'package';"
    const missingFromRegex = /import\s+({[^}]+}|\w+)\s+'([^']+)';/g;
    content = content.replace(missingFromRegex, (match, identifiers, source) => {
        modified = true;
        return `import ${identifiers} from '${source}';`;
    });

    // Pattern 3: Malformed import with 'N' or other strange characters
    // Example: "N extRequest, NextResponse 'next/server';"
    const malformedImportRegex = /^(\s*)N\s+([A-Za-z0-9_,\s]+)\s+'([^']+)';/gm;
    content = content.replace(malformedImportRegex, (match, space, identifiers, source) => {
        modified = true;
        const cleanedIdentifiers = identifiers
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ')
            .trim();

        return `${space}import { ${cleanedIdentifiers} } from '${source}';`;
    });

    // Pattern 4: Fix 'useEffect' and similar patterns
    // Example: "useEffect, useState 'react';"
    const malformedHooksRegex = /^(\s*)us\s+eEffect/gm;
    content = content.replace(malformedHooksRegex, (match, space) => {
        modified = true;
        return `${space}import { useEffect`;
    });

    // Pattern 5: Fix duplicate 'import' and 'from' keywords
    // Example: "import import type { BaseEntity } from from './common';"
    const duplicateKeywordsRegex = /import\s+import\s+(.+?)\s+from\s+from\s+/g;
    content = content.replace(duplicateKeywordsRegex, (match, middle) => {
        modified = true;
        return `import ${middle} from `;
    });

    // Pattern 6: Fix duplicate 'import' keyword
    // Example: "import import { Something } from './somewhere';"
    const duplicateImportRegex = /import\s+import\s+/g;
    content = content.replace(duplicateImportRegex, (match) => {
        modified = true;
        return `import `;
    });

    // Pattern 7: Fix duplicate 'from' keyword
    // Example: "import { Something } from from './somewhere';"
    const duplicateFromRegex = /\s+from\s+from\s+/g;
    content = content.replace(duplicateFromRegex, (match) => {
        modified = true;
        return ` from `;
    });

    // Pattern 8: Fix malformed import with missing curly braces
    // Example: "import nameFilter TypeMap from '@/types/api/common';"
    const missingCurlyBracesRegex = /import\s+([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s+from\s+/g;
    content = content.replace(missingCurlyBracesRegex, (match, name1, name2) => {
        modified = true;
        return `import { ${name1}, ${name2} } from `;
    });

    // Pattern 9: Fix malformed import with 'import' followed by identifier without 'from'
    // Example: "import nameFilterTypeMap '@/types/api/common';"
    const missingFromKeywordRegex = /import\s+([a-zA-Z0-9_]+)\s+'([^']+)';/g;
    content = content.replace(missingFromKeywordRegex, (match, name, source) => {
        modified = true;
        return `import { ${name} } from '${source}';`;
    });

    // Pattern 10: Fix split variable names in import statements
    // Example: "import { Susp, ense } from 'react';"
    const splitVariableRegex = /import\s+{\s*([A-Za-z]+),\s*([a-z]+)\s*}\s+from\s+['"]([^'"]+)['"]/g;
    content = content.replace(splitVariableRegex, (match, part1, part2, source) => {
        // Check if this looks like a split variable name (first part capitalized, second part lowercase)
        if (part1[0] === part1[0].toUpperCase() && part2 === part2.toLowerCase()) {
            const combinedName = part1 + part2;
            // Common React imports that might be split
            if ((source === 'react' && ['Suspense', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef'].includes(combinedName)) ||
                (combinedName === 'PageHeader')) {
                modified = true;
                return `import { ${combinedName} } from '${source}'`;
            }
        }
        return match;
    });

    // Pattern 11: Fix nameFilter, TypeMap to nameFilterTypeMap
    // Example: "import { nameFilter, TypeMap } from '@/types/api/common';"
    const nameFilterTypeMapRegex = /import\s+{\s*nameFilter,\s*TypeMap\s*}\s+from\s+['"]([^'"]+)['"]/g;
    content = content.replace(nameFilterTypeMapRegex, (match, source) => {
        modified = true;
        return `import { nameFilterTypeMap } from '${source}'`;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed import statements in ${filePath}`);
        return true;
    }

    return false;
}

// Main function
function main() {
    try {
        // Get all TypeScript files
        const tsFiles = getTypeScriptFiles(path.resolve(__dirname, 'src'));
        let fixedCount = 0;

        // Process each file
        tsFiles.forEach(filePath => {
            if (fixImportStatements(filePath)) {
                fixedCount++;
            }
        });

        console.log(`Fixed import statements in ${fixedCount} files.`);
        console.log('Running lint to check remaining issues...');

        try {
            execSync('pnpm lint', {stdio: 'inherit'});
            console.log('Linting completed successfully!');
        } catch (lintError) {
            console.log('Linting completed with some issues remaining.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
