import test from 'node:test'
import assert from 'node:assert/strict'
import { isCompleteArticleTranslation } from '../server/services/articles'
import { parseLocale } from '../server/utils/locales'

test('article localization completeness', () => {
  assert.equal(isCompleteArticleTranslation({ title:'EN', slug:'en-slug', excerpt:'Excerpt', body:[{type:'paragraph',text:'Body'}] }), true)
  assert.equal(isCompleteArticleTranslation({ title:'EN', slug:null, excerpt:'Excerpt', body:[] }), false)
  assert.equal(isCompleteArticleTranslation({ title:'EN', slug:'slug', excerpt:'', body:[{type:'paragraph'}] }), false)
})

test('article localization locale validation', () => {
  assert.equal(parseLocale(undefined), 'id')
  assert.equal(parseLocale('id'), 'id')
  assert.equal(parseLocale('en'), 'en')
  assert.throws(() => parseLocale('fr'), /Locale tidak didukung/)
})
