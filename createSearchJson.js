import chain from 'stream-chain';
import parser from 'stream-json';
import pick from 'stream-json/filters/pick.js';
import streamArray from 'stream-json/streamers/stream-array.js';
import fs from 'fs'

const search = {}
const fields = {
    demo_doc: ['id', 'blackfootname', 'englishname', 'literalmeaning', 'refaltnames', 'altspelling', 'altnames', 'description'],
    demo_story: ['id', 'title', 'reference', 'description'],
    demo_archy: ['id', 'title', 'reference', 'description'],
    demo_archive: ['id', 'caption', 'credit', 'description'],
}

const processFile = async function (filepath, type) {
    console.log('start')
    search[type] = []
    const pipeline = chain([
    fs.createReadStream(filepath),
    parser(),
    pick({filter: 'features'}),
    streamArray(),
    data => {
        if(data?.value) {
            const values = {id: data?.value?.id, ...data?.value?.properties}
            return values
        } else {
            return {}
        }
    }
    ]);

    pipeline.on('data', (values) => {
        const sdata = {}
        for(const f of fields[type]) {
            sdata[f] = values[f]
        }
        search[type].push(sdata)
    });
    return new Promise((resolve, reject) => {
        pipeline.on('error', reject);
        pipeline.on('end', resolve);
    });

    return pipeline;
}

await processFile('./src/_data/demo_story.json', 'demo_story')
await processFile('./src/_data/demo_archy.json', 'demo_archy')
await processFile('./src/_data/demo_archive.geojson', 'demo_archive')
await processFile('./src/_data/demo_doc.json', 'demo_doc')
fs.writeFileSync("./src/_data/search.json", JSON.stringify(search), 'utf8')