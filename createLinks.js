import chain from 'stream-chain';
import parser from 'stream-json';
import pick from 'stream-json/filters/pick.js';
import streamArray from 'stream-json/streamers/stream-array.js';
import fs from 'fs'

const links = {}

const processFile = async function (filepath, type) {
    console.log('start')
    const pipeline = chain([
    fs.createReadStream(filepath),
    parser(),
    pick({filter: 'features'}),
    streamArray(),
    data => {
        if(data?.value?.properties?.nunaliit_relations) {
            return data.value.properties?.nunaliit_relations.map((r) => {return {sid: data.value.id, tid: r.doc, t: r.type}})
        } else {
            return []
        }
    }
    ]);

    pipeline.on('data', (values) => {
        for(const l of values) {
            if(!(links.hasOwnProperty(l.sid))) {
                links[l.sid] = [];
            }
            if(!(links.hasOwnProperty(l.tid))) {
                links[l.tid] = [];
            }
            links[l.sid].push({tid: l.tid, t: l.t});
            links[l.tid].push({tid: l.sid, t: type}); //backlink
        }
    });
    return new Promise((resolve, reject) => {
        pipeline.on('error', reject);
        pipeline.on('end', resolve);
    });

    return pipeline;
}

await processFile('./src/_data/demo_story.json', 'demo_story')
await processFile('./src/_data/demo_archy.geojson', 'demo_archy')
await processFile('./src/_data/demo_archive.geojson', 'demo_archive')
await processFile('./src/_data/demo_doc.json', 'demo_doc')
fs.writeFileSync("./src/_data/links.json", JSON.stringify(links), 'utf8')