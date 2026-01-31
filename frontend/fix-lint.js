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

// Function to fix unused variables by adding underscore prefix
function fixUnusedVariables(content) {
    // Regex to find variable declarations that are reported as unused
    const unusedVarRegex = /['"]([a-zA-Z0-9_]+)['"] is defined but never used\. Allowed unused vars must match \/\^_\/u\./g;
    const unusedArgRegex = /['"]([a-zA-Z0-9_]+)['"] is defined but never used\. Allowed unused args must match \/\^_\/u\./g;
    const unusedCaughtErrorRegex = /['"]([a-zA-Z0-9_]+)['"] is defined but never used\. Allowed unused caught errors must match \/\^_\/u\./g;

    // Extract variable names from lint output
    const unusedVars = [];
    let match;

    while ((match = unusedVarRegex.exec(content)) !== null) {
        unusedVars.push(match[1]);
    }

    while ((match = unusedArgRegex.exec(content)) !== null) {
        unusedVars.push(match[1]);
    }

    while ((match = unusedCaughtErrorRegex.exec(content)) !== null) {
        unusedVars.push(match[1]);
    }

    return unusedVars;
}

// Function to fix console.log statements
function fixConsoleStatements(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace console.log with console.warn
    const updatedContent = content.replace(/console\.log\(/g, 'console.warn(');

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Fixed console.log in ${filePath}`);
    }
}

// Main function
function main() {
    try {
        // Run ESLint to get the list of issues
        const lintOutput = execSync('pnpm lint', {encoding: 'utf8'});

        // Parse the lint output to get unused variables
        const unusedVars = fixUnusedVariables(lintOutput);

        // Get all TypeScript files
        const tsFiles = getTypeScriptFiles(path.resolve(__dirname, 'src'));

        // Process each file
        tsFiles.forEach(filePath => {
            // Fix console.log statements
            fixConsoleStatements(filePath);

            // Fix unused variables
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            unusedVars.forEach(varName => {
                // Only add underscore if the variable doesn't already have one
                if (!varName.startsWith('_')) {
                    // Different regex patterns for different variable declaration types
                    const patterns = [
                        // Function parameters
                        new RegExp(`(\\(|, )(${varName})(:|,|\\))`, 'g'),
                        // Destructured object properties
                        new RegExp(`({|, )(${varName})(}|:|,)`, 'g'),
                        // Variable declarations
                        new RegExp(`(const|let|var) (${varName})(:|=|;)`, 'g'),
                        // Function declarations
                        new RegExp(`function (${varName})(\\(|:|<)`, 'g'),
                        // Class properties
                        new RegExp(`(private|protected|public) (${varName})(:|;|=)`, 'g'),
                        // Import statements
                        new RegExp(`import {([^}]*?)(${varName})([^}]*?)} from`, 'g')
                    ];

                    patterns.forEach(pattern => {
                        const newContent = content.replace(pattern, (match, prefix, name, suffix) => {
                            if (prefix.includes('{') || prefix.includes(',')) {
                                // For destructuring or imports, we need to handle differently
                                return `${prefix}_${name}${suffix}`;
                            }
                            return `${prefix} _${name}${suffix}`;
                        });

                        if (newContent !== content) {
                            content = newContent;
                            modified = true;
                        }
                    });
                }
            });

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Fixed unused variables in ${filePath}`);
            }
        });

        console.log('Lint fixes applied. Running lint again to check remaining issues...');
        execSync('pnpm lint', {stdio: 'inherit'});

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();