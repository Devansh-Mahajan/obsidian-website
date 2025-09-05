import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import grayMatter from 'gray-matter';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASTRO_BLOG_PATH = path.join(PROJECT_ROOT, 'src/content/blog');
const ASTRO_NOTES_PATH = path.join(PROJECT_ROOT, 'src/content/notes');
// Assuming project is at .../Obsidian/Personal/Blog → vault root is parent directory
const VAULT_ROOT = path.resolve(PROJECT_ROOT, '..');

// Directories to exclude from scanning
const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    '.astro',
    ASTRO_BLOG_PATH,
    'public'
];

async function cleanBlogDirectory() {
    try {
        // Remove all files in the blog directory
        const files = await fs.readdir(ASTRO_BLOG_PATH);
        await Promise.all(
            files.map(file => 
                fs.unlink(path.join(ASTRO_BLOG_PATH, file))
            )
        );
        console.log('🧹 Cleaned blog directory');
    } catch (error) {
        // If directory doesn't exist, that's fine
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

async function cleanNotesDirectory() {
    try {
        const files = await fs.readdir(ASTRO_NOTES_PATH);
        await Promise.all(
            files.map(file => 
                fs.unlink(path.join(ASTRO_NOTES_PATH, file))
            )
        );
        console.log('🧹 Cleaned notes directory');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

async function findMarkdownFiles(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    let markdownFiles = [];

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);
        
        if (file.isDirectory()) {
            // Skip excluded directories
            if (EXCLUDED_DIRS.some(excluded => 
                relativePath.startsWith(excluded) || file.name.startsWith('.'))) {
                continue;
            }
            markdownFiles = markdownFiles.concat(await findMarkdownFiles(fullPath));
        } else if (file.name.endsWith('.md')) {
            markdownFiles.push(fullPath);
        }
    }

    return markdownFiles;
}

function shouldPublishPost(frontmatter) {
    // Handle different variations of the publish field
    const publishField = frontmatter.publish ?? frontmatter.published ?? frontmatter.draft;
    
    if (publishField === undefined) {
        return false; // If no publish field is found, don't publish
    }

    // Handle the case where draft: true means don't publish
    if (frontmatter.hasOwnProperty('draft')) {
        return !frontmatter.draft;
    }

    // Convert to boolean to handle strings like 'true', '1', etc.
    return Boolean(publishField);
}

async function processMarkdownFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        let frontmatter = {}, postContent = content;
        
        try {
            const parsed = grayMatter(content);
            frontmatter = parsed.data;
            postContent = parsed.content;
        } catch (parseError) {
            console.error(`Error parsing frontmatter in ${filePath}:`, parseError);
            return; // Skip this file if frontmatter parsing fails
        }
        
        // Check if the post should be published
        if (shouldPublishPost(frontmatter)) {
            const fileName = path.basename(filePath);
            const destinationPath = path.join(ASTRO_BLOG_PATH, fileName);
            
            // Copy file to Astro blog directory
            await fs.copyFile(filePath, destinationPath);
            console.log(`✅ Copied ${path.relative(PROJECT_ROOT, filePath)} to blog directory`);
        } else {
            console.log(`ℹ️ Skipped ${path.relative(PROJECT_ROOT, filePath)} (not marked for publishing)`);
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function syncObsidianPosts() {
    try {
        // First, ensure blog directory exists
        await fs.mkdir(ASTRO_BLOG_PATH, { recursive: true });
        await fs.mkdir(ASTRO_NOTES_PATH, { recursive: true });
        
        // Clean the blog directory
        await cleanBlogDirectory();
        await cleanNotesDirectory();
        
        // 1) Blog posts: find all markdown files starting from project root
        const markdownFiles = await findMarkdownFiles(PROJECT_ROOT);
        await Promise.all(markdownFiles.map(processMarkdownFile));

        // 2) Notes: copy all markdown files from vault root (000–999), excluding Blog folder
        const VAULT_INCLUDE_PREFIXES = [
            '000', '100', '200', '300', '400', '500', '600', '700', '800', '900', '998', '999'
        ];
        const EXCLUDE_NAMES = new Set(['Blog', 'node_modules', '.git', '.obsidian']);

        async function findVaultMarkdown(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            let files = [];
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                const relFromVault = path.relative(VAULT_ROOT, full);
                if (entry.isDirectory()) {
                    const isRootLevel = path.dirname(relFromVault) === '';
                    if (isRootLevel) {
                        // Only descend into top-level folders matching allowed prefixes
                        const allowed = VAULT_INCLUDE_PREFIXES.some(prefix => entry.name.startsWith(prefix));
                        if (!allowed || EXCLUDE_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;
                    } else {
                        // Skip hidden and excluded nested directories
                        if (entry.name.startsWith('.') || EXCLUDE_NAMES.has(entry.name)) continue;
                    }
                    files = files.concat(await findVaultMarkdown(full));
                } else if (entry.name.endsWith('.md')) {
                    files.push(full);
                }
            }
            return files;
        }

        const vaultMarkdownFiles = await findVaultMarkdown(VAULT_ROOT);
        await Promise.all(
            vaultMarkdownFiles.map(async (srcPath) => {
                const fileName = path.basename(srcPath);
                const destPath = path.join(ASTRO_NOTES_PATH, fileName);
                await fs.copyFile(srcPath, destPath);
                console.log(`🗒️  Copied note ${path.relative(VAULT_ROOT, srcPath)} → notes`);
            })
        );
        
        console.log('🎉 Sync completed successfully!');
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

// Just run the sync once
syncObsidianPosts(); 