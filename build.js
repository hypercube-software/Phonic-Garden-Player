import fs from 'fs';
import path from 'path';
import CRC32 from 'buffer-crc32';

const fileMap = new Map();
const distDir = "dist";
const cfg = JSON.parse(fs.readFileSync("config.json"));
copyFile("css", distDir);
copyFile("assets", distDir);
copyFile("src", distDir);
generateTemplate("404.html", distDir + "/404.html");
generateTemplate(".htaccess", distDir + "/.htaccess");
generateHtml();

function generateHtml() {
    var index = fs.readFileSync("index.html", 'utf8')
    for (const k of fileMap.keys()) {
        const v = fileMap.get(k);
        console.log(k.padEnd(30," ") + "=> " + v);
        index = index.replace(k, v);
    }
    index = index.replaceAll("@@TITLE@@", cfg.title);
    fs.writeFileSync(distDir + "/index.html", index);
}

function cleanupDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const files = fs.readdirSync(dir);
    files.forEach(f => {
        const file = path.join(dir, f);
        if (fs.lstatSync(file).isDirectory()) {
            cleanupDir(file);
        } else if (fs.existsSync(file)) {
            console.log("Delete " + file);
            fs.unlinkSync(file);
        }
    });
}
function copyFile(srcDir, dstDir) {
    dstDir = dstDir + "/" + path.basename(srcDir);
    cleanupDir(dstDir);
    const files = fs.readdirSync(srcDir);
    files.map(f => path.join(srcDir, f)).forEach(f => {
        if (fs.lstatSync(f).isFile()) {
            const fileBuffer = fs.readFileSync(f);
            

            if (f.endsWith(".js") || f.endsWith(".css")) {
                const crc32 = CRC32(fileBuffer);

                const hex = crc32.toString('hex').toUpperCase();
                const p = path.parse(f);
                const src = srcDir + "/" + p.name + p.ext;
                const dest = dstDir + "/" + p.name + "." + hex + p.ext;
                const webDest = dest.substring(dest.indexOf('/') + 1);
                fileMap.set(src, webDest);

                generateTemplate(src, dest);
            }
            else {
                const dest = dstDir + "/" + path.basename(f);
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.writeFileSync(dest, fileBuffer);
            }
        }
        else if (fs.lstatSync(f).isDirectory()) {
            const name = path.basename(f);
            copyFile(srcDir + "/" + name, dstDir);
        }
    });
}

function generateTemplate(src, dst) {
    var content = fs.readFileSync(src, 'utf8')
    content = content.replaceAll("@@BASEURL@@", cfg.baseUrl);
    content = content.replaceAll("@@TITLE@@", cfg.title);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, content);
}
