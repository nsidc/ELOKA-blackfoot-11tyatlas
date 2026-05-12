import Alpine from 'alpinejs'
import MiniSearch from 'minisearch'

const fields = {
  demo_doc: ['id', 'blackfootname', 'englishname', 'literalmeaning', 'refaltnames', 'altspelling', 'altnames', 'description'],
  demo_story: ['id', 'title', 'reference', 'description'],
  demo_archy: ['id', 'title', 'reference', 'description'],
  demo_archive: ['id', 'caption', 'credit', 'description']
}

const searchEl = document.getElementById('searchCard')
const searchResultsEl = document.getElementById('searchResultsList')

function setup() {
  Alpine.store('search', {
    results: null,
    showResults: null,
    searchText: '',
    types: [],
    data: null,
    async search() {
      Alpine.store('feature').unselect()
      if (this.data == null) {
        const dataRes = await fetch('./public/search.json')
        const dataObj = await dataRes.json()
        this.types = Object.keys(fields)
        const searchData = {}
        for (const t of this.types) {
          searchData[t] = new MiniSearch({fields: fields[t], storeFields: fields[t]})
          searchData[t].addAll(dataObj[t])
        }
        this.data = searchData
      }
      this.results = []
      for (const t of this.types) {
        let resultsIdx = 0
        const mergedArray = []
        const hits = this.data[t].search(this.searchText, {fuzzy: 0.2})
        const totalResults = this.results.length + hits.length
        let addedResults = 0
        let i = 0
        let j = 0
        while(addedResults < totalResults) {
          if(i >= this.results.length) {
            mergedArray.push({id: hits[j].id, t, score: hits[j].score, data: hits[j]})
            j++
          } else if(j >= hits.length) {
            mergedArray.push(this.results[i])
            i++
          } else{
            if(hits[j].score > this.results[i].score) {
              mergedArray.push({id: hits[j].id, t, score: hits[j].score, data: hits[j]})
              j++
            } else {
              mergedArray.push(this.results[i])
              i++
            }
          }
          addedResults++
        }
        
        this.results = mergedArray
      }
      this.showResults = this.results.slice(0, 20)
      await this.displayResults()
      searchEl.classList.remove('hidden')
    },
    async displayResults() {
      let resultsListHtml = ''
      for(const r of this.showResults) {
        if(r.t == 'demo_archive') {
          const responseText = await (await fetch(`media/${r.id}_insert.html`)).text()
          let displayHtml = `<div class="collapse collapse-arrow bg-base-100 border-base-300 border"
            @mouseenter="$dispatch('hover', '${r.id}')" @mouseleave="$dispatch('unhover')">
              <input type="checkbox" class="peer" />
              <div class="collapse-title">
                <div class="font-semibold">${r.data?.caption}</div>
                <div class="text-xs">Archival Document</div>
              </div>
              <div class="collapse-content text-sm" @click="$store.feature.select('${r.id}')">
                ${responseText}
              </div>
            </div>`
          resultsListHtml += displayHtml
        } else if(r.t == 'demo_story') {
          resultsListHtml += await (await fetch(`story/${r.id}_insert.html`)).text()
        } else if(r.t == 'demo_archy') {
          resultsListHtml += await (await fetch(`archaeology/${r.id}_insert.html`)).text()
        } else if(r.t == 'demo_doc') {
          const docInfo = await (await fetch(`features/${r.id}.json`)).json()
          resultsListHtml += `<div class="collapse collapse-arrow bg-base-100 border-base-300 border"
            @mouseenter="$dispatch('hover', '${r.id}')" @mouseleave="$dispatch('unhover')">
              <input type="checkbox" class="peer" />
              <div class="collapse-title">
                <div class="font-semibold">${docInfo.blackfootname} - ${docInfo.englishname}</div>
                <div class="text-xs">Placename</div>
              </div>
              <div class="collapse-content text-sm" @click="$store.feature.select('${r.id}')">
                <div class="text-sm">
                  ${docInfo.blackfootname}
                </div>
              </div>
            </div>`
        } else {
          console.error(`Unknown type: ${t}`)
        }
      }
      searchResultsEl.innerHTML = resultsListHtml
    },
    hide() {
      searchEl.classList.add('hidden')
    }
  })
}

export default { setup }
