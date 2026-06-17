// GitHub-Pages-Version: Kein PHP/STRATO-Backend.
// GitHub Pages hostet statische Dateien. Die Daten laufen in dieser Version über Firebase/Firestore.
function isStratoBackend() { return false; }
async function stratoListJobs() { throw new Error('STRATO-Backend ist in der GitHub-Pages-Version deaktiviert.'); }
async function stratoGetJob() { throw new Error('STRATO-Backend ist in der GitHub-Pages-Version deaktiviert.'); }
async function stratoCreateJob() { throw new Error('STRATO-Backend ist in der GitHub-Pages-Version deaktiviert.'); }
async function stratoUpdateJob() { throw new Error('STRATO-Backend ist in der GitHub-Pages-Version deaktiviert.'); }
async function stratoIncrementJobViews() { return null; }
async function stratoDeleteJob() { throw new Error('STRATO-Backend ist in der GitHub-Pages-Version deaktiviert.'); }
