import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { eppoGet } from "../utils/eppoApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
    const relativePath = process.argv[2];

    if (!relativePath) {
        console.error("Usage: node scripts/testEppoApi.js <relative-path>");
        console.error("Example: node scripts/testEppoApi.js status");
        process.exit(1);
    }

    const data = await eppoGet(relativePath);
    console.log(JSON.stringify(data, null, 2));
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
