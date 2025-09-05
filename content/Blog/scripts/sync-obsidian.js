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
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const SEARCH_INDEX_PATH = path.join(PUBLIC_DIR, 'notes-index.json');
const BACKLINKS_PATH = path.join(PUBLIC_DIR, 'notes-backlinks.json');
const ATTACHMENTS_DIR = path.join(PUBLIC_DIR, 'attachments');

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
            files.map(async (file) => {
                const filePath = path.join(ASTRO_NOTES_PATH, file);
                const stat = await fs.stat(filePath);
                if (stat.isDirectory()) {
                    await fs.rm(filePath, { recursive: true, force: true });
                } else {
                    await fs.unlink(filePath);
                }
            })
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

        // 2) Notes: copy only specified folders from vault root, excluding Blog folder
        const VAULT_INCLUDE_PREFIXES = [
            '200', '300', '500', '700', '800', '998'
        ];
        const EXCLUDE_NAMES = new Set(['Blog', 'node_modules', '.git', '.obsidian', 'Welcome.md']);

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
                } else if (entry.name.endsWith('.md') || entry.name.endsWith('.tex') || entry.name.endsWith('.apkg')) {
                    // Include markdown, LaTeX, and Anki files that are NOT in the vault root
                    const isInVaultRoot = path.dirname(relFromVault) === '';
                    if (!isInVaultRoot) {
                        files.push(full);
                    }
                }
            }
            return files;
        }

        // Find markdown files only in specified folders
        async function findVaultMarkdownInSpecifiedFolders() {
            let allFiles = [];
            for (const prefix of VAULT_INCLUDE_PREFIXES) {
                const entries = await fs.readdir(VAULT_ROOT, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && entry.name.startsWith(prefix) && !EXCLUDE_NAMES.has(entry.name)) {
                        const folderPath = path.join(VAULT_ROOT, entry.name);
                        const files = await findVaultMarkdown(folderPath);
                        allFiles = allFiles.concat(files);
                    }
                }
            }
            return allFiles;
        }

        // Find all attachment files (images, PDFs, etc.) in specified folders only
        async function findVaultAttachments(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            let files = [];
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                const relFromVault = path.relative(VAULT_ROOT, full);
                if (entry.isDirectory()) {
                    const isRootLevel = path.dirname(relFromVault) === '';
                    if (isRootLevel) {
                        // Only include specified folders
                        const allowed = VAULT_INCLUDE_PREFIXES.some(prefix => entry.name.startsWith(prefix));
                        if (!allowed || EXCLUDE_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;
                    } else {
                        if (entry.name.startsWith('.') || EXCLUDE_NAMES.has(entry.name)) continue;
                    }
                    files = files.concat(await findVaultAttachments(full));
                } else {
                    // Include common attachment types
                    const ext = path.extname(entry.name).toLowerCase();
                    const attachmentExts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.webm', '.mp3', '.wav', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
                    if (attachmentExts.includes(ext)) {
                        files.push(full);
                    }
                }
            }
            return files;
        }

        const vaultMarkdownFiles = await findVaultMarkdownInSpecifiedFolders();

        // Build a lookup for wikilinks: basename -> dest relative path (first unique match wins)
        function computeDestRelative(srcFullPath) {
            const relFromVault = path.relative(VAULT_ROOT, srcFullPath);
            // Keep the full Obsidian structure including numbers
            return relFromVault.replace(/\\/g, '/');
        }

        const basenameToRel = new Map();
        for (const src of vaultMarkdownFiles) {
            const rel = computeDestRelative(src);
            const base = path.basename(src, '.md');
            if (!basenameToRel.has(base)) {
                basenameToRel.set(base, rel.replace(/\\/g, '/').replace(/\.md$/i, ''));
            }
        }

        function convertWikiLinks(markdown, outgoingCollector) {
            // Handle [[Page]], [[Page|Alias]], [[Page#Heading]], [[Page#Heading|Alias]]
            return markdown.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (m, page, heading, alias) => {
                const target = String(page).trim();
                const destRel = basenameToRel.get(target);
                if (!destRel) return m; // leave unchanged if not found
                const url = `/notes/${destRel}${heading ? `#${heading.trim().toLowerCase().replace(/\s+/g, '-')}` : ''}`;
                const text = (alias || target).trim();
                if (outgoingCollector && typeof outgoingCollector.push === 'function') {
                    outgoingCollector.push(destRel);
                }
                return `[${text}](${url})`;
            });
        }

        function convertAttachmentLinks(markdown, attachmentMap) {
            // Convert ![[attachment.pdf]] and [[attachment.pdf]] to proper links
            return markdown.replace(/!?\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (m, file, alias) => {
                const fileName = String(file).trim();
                const attachmentPath = attachmentMap.get(fileName);
                if (!attachmentPath) return m; // leave unchanged if not found
                const url = `/attachments/${attachmentPath}`;
                const text = (alias || fileName).trim();
                const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(fileName);
                if (isImage) {
                    return `![${text}](${url})`;
                } else {
                    return `[${text}](${url})`;
                }
            });
        }

        const searchIndex = [];
        const outgoingMap = new Map(); // rel -> Set of outgoing rels
        const attachmentMap = new Map(); // filename -> public path

        // First, copy all attachments and build attachment map
        await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
        // Find attachments only in specified folders
        let vaultAttachmentFiles = [];
        for (const prefix of VAULT_INCLUDE_PREFIXES) {
            const entries = await fs.readdir(VAULT_ROOT, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith(prefix) && !EXCLUDE_NAMES.has(entry.name)) {
                    const folderPath = path.join(VAULT_ROOT, entry.name);
                    const files = await findVaultAttachments(folderPath);
                    vaultAttachmentFiles = vaultAttachmentFiles.concat(files);
                }
            }
        }
        await Promise.all(
            vaultAttachmentFiles.map(async (srcPath) => {
                const relFromVault = path.relative(VAULT_ROOT, srcPath);
                // Keep the full Obsidian structure including numbers
                const destRel = relFromVault.replace(/\\/g, '/');
                const destPath = path.join(ATTACHMENTS_DIR, destRel);
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                await fs.copyFile(srcPath, destPath);
                const fileName = path.basename(srcPath);
                attachmentMap.set(fileName, destRel);
                console.log(`📎 Copied attachment ${path.relative(VAULT_ROOT, srcPath)} → attachments/${destRel}`);
            })
        );

        // Then process markdown, LaTeX, and Anki files
        await Promise.all(
            vaultMarkdownFiles.map(async (srcPath) => {
                const fileExt = path.extname(srcPath).toLowerCase();
                const destRel = computeDestRelative(srcPath);
                const destPath = path.join(ASTRO_NOTES_PATH, destRel);
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                
                if (fileExt === '.md') {
                    // Process markdown files
                    const raw = await fs.readFile(srcPath, 'utf8');
                    let fm = {};
                    let body = raw;
                    try {
                        const parsed = grayMatter(raw);
                        fm = parsed.data || {};
                        body = parsed.content || '';
                    } catch {}
                    const outgoing = [];
                    const transformedBody = convertWikiLinks(convertAttachmentLinks(body, attachmentMap), outgoing);
                    const transformed = grayMatter.stringify(transformedBody, fm);
                    await fs.writeFile(destPath, transformed, 'utf8');
                    console.log(`🗒️  Copied note ${path.relative(VAULT_ROOT, srcPath)} → notes/${destRel}`);

                    // Build search index record
                    const title = (fm.title && String(fm.title)) || path.basename(destRel).replace(/-/g, ' ').replace(/_/g, ' ');
                    const plain = transformedBody
                        .replace(/```[\s\S]*?```/g, ' ') // strip code blocks
                        .replace(/`[^`]*`/g, ' ') // strip inline code
                        .replace(/\!\[[^\]]*\]\([^\)]*\)/g, ' ') // strip images
                        .replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => m.replace(/\[[^\]]*\]\(/, '').replace(/\)$/, ' ')) // strip link text keep target text minimal
                        .replace(/[#>*_\-]+/g, ' ') // markdown punctuation
                        .replace(/\s+/g, ' ') // collapse whitespace
                        .trim();
                    searchIndex.push({ path: destRel.replace(/\\/g, '/').replace(/\.md$/i, ''), title, content: plain });

                    // Record outgoing links
                    outgoingMap.set(destRel.replace(/\\/g, '/').replace(/\.md$/i, ''), new Set(outgoing.map(r => r.replace(/\\/g, '/').replace(/\.md$/i, ''))));
                } else if (fileExt === '.tex') {
                    // Process LaTeX files
                    const content = await fs.readFile(srcPath, 'utf8');
                    const title = path.basename(srcPath, '.tex');
                    const frontmatter = {
                        title: title,
                        description: `LaTeX document: ${title}`,
                        publish: true,
                        type: 'latex',
                        created_date: new Date()
                    };
                    
                    const markdownContent = `# ${title}\n\n\`\`\`latex\n${content}\n\`\`\``;
                    const finalContent = grayMatter.stringify(markdownContent, frontmatter);
                    
                    await fs.writeFile(destPath.replace('.tex', '.md'), finalContent, 'utf8');
                    console.log(`📄 Copied LaTeX ${path.relative(VAULT_ROOT, srcPath)} → notes/${destRel.replace('.tex', '.md')}`);
                    
                    // Add to search index
                    searchIndex.push({ 
                        path: destRel.replace(/\\/g, '/').replace(/\.tex$/i, ''), 
                        title, 
                        content: `LaTeX document ${title}` 
                    });
                } else if (fileExt === '.apkg') {
                    // Process Anki files
                    const title = path.basename(srcPath, '.apkg');
                    const frontmatter = {
                        title: title,
                        description: `Anki deck: ${title}`,
                        publish: true,
                        type: 'anki',
                        created_date: new Date()
                    };
                    
                    const markdownContent = `# ${title}\n\n## Anki Deck\n\nThis is an Anki flashcard deck. Download the file to import into Anki.\n\n**File:** \`${path.basename(srcPath)}\`\n\n*Note: This deck can be imported into Anki for spaced repetition learning.*`;
                    const finalContent = grayMatter.stringify(markdownContent, frontmatter);
                    
                    await fs.writeFile(destPath.replace('.apkg', '.md'), finalContent, 'utf8');
                    console.log(`🃏 Copied Anki ${path.relative(VAULT_ROOT, srcPath)} → notes/${destRel.replace('.apkg', '.md')}`);
                    
                    // Add to search index
                    searchIndex.push({ 
                        path: destRel.replace(/\\/g, '/').replace(/\.apkg$/i, ''), 
                        title, 
                        content: `Anki deck ${title}` 
                    });
                }
            })
        );
        
        // Build backlinks map
        const backlinks = {};
        for (const [from, outs] of outgoingMap.entries()) {
            for (const to of outs) {
                backlinks[to] = backlinks[to] || [];
                const item = searchIndex.find(x => x.path === from);
                backlinks[to].push({ path: from, title: item ? item.title : from.split('/').pop() });
            }
        }

        // Write index files
        await fs.mkdir(PUBLIC_DIR, { recursive: true });
        await fs.writeFile(SEARCH_INDEX_PATH, JSON.stringify(searchIndex, null, 2), 'utf8');
        await fs.writeFile(BACKLINKS_PATH, JSON.stringify(backlinks, null, 2), 'utf8');
        console.log(`🔎 Wrote search index (${searchIndex.length} notes) and backlinks map`);

        console.log('🎉 Sync completed successfully!');
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

// Just run the sync once
syncObsidianPosts(); 