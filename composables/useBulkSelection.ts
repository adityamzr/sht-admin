export function useBulkSelection<T extends { id: number }>() {
  const selected = ref<number[]>([])
  const selectedSet = computed(() => new Set(selected.value))
  function toggle(id:number){selected.value=selectedSet.value.has(id)?selected.value.filter(x=>x!==id):[...selected.value,id]}
  function selectPage(items:T[]){const ids=items.map(x=>x.id);selected.value=selected.value.length===ids.length&&ids.every(x=>selectedSet.value.has(x))?[]:ids}
  function clear(){selected.value=[]}
  function isSelected(id:number){return selectedSet.value.has(id)}
  return {selected,selectedSet,toggle,selectPage,clear,isSelected}
}
