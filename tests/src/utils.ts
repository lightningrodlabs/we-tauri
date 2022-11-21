import path from 'path'
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sensemakerDnaDna = path.join(__dirname, "../../dnas/sensemaker/workdir/sensemaker.dna");
export const testProviderDnaDna = path.join(__dirname, "../../dnas/test_provider/workdir/test_provider_dna.dna");



