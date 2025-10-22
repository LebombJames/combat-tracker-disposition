import * as Vite from "vite";
import path from "path";
import esbuild from "esbuild";
import fs from "fs-extra";

await fs.ensureDir("dist");
await Promise.all([fs.copyFile("./README.md", "./dist/README.md"), fs.copyFile("./module.json", "./dist/module.json")]);

const config: Vite.UserConfig = {
    root: "src/",
    base: "/modules/combat-tracker-disposition/",
    publicDir: path.resolve(__dirname, "static"),
    server: {
        port: 30001,
        open: true,
        proxy: {
            "^(?!/modules/combat-tracker-disposition/)": "http://localhost:30000/",
            "/socket.io": {
                target: "ws://localhost:30000",
                ws: true
            }
        }
    },
    build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        target: "esnext",
        cssMinify: "esbuild",
        lib: {
            name: "combat-tracker-disposition",
            entry: path.resolve(__dirname, "src/module/combat-tracker-disposition.ts"),
            formats: ["es"],
            fileName: "combat-tracker-disposition"
        }
    },
    plugins: [minifyPlugin()]
};

function minifyPlugin(): Vite.Plugin {
    return {
        name: "minify",
        config() {
            // If https://github.com/vitejs/vite/issues/2830 is addressed then CSS minification can be enabled.
            return {
                build: {
                    minify: false
                }
            };
        },
        renderChunk: {
            order: "post",
            async handler(code) {
                return esbuild.transform(code, {
                    keepNames: true,
                    minify: true,
                    sourcemap: true,
                    format: "esm"
                });
            }
        }
    };
}

export default config;
