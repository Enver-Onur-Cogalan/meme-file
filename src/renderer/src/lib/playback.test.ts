import { describe, expect, it } from 'vitest'
import { adjacentId, randomId } from './playback'

const list = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('adjacentId', () => {
  it('bir sonrakine ve bir öncekine gider', () => {
    expect(adjacentId(list, 1, 1)).toBe(2)
    expect(adjacentId(list, 3, -1)).toBe(2)
  })

  it('uçlarda başa sarar', () => {
    expect(adjacentId(list, 3, 1)).toBe(1)
    expect(adjacentId(list, 1, -1)).toBe(3)
  })

  it('liste boşsa ya da video listede yoksa null döner', () => {
    expect(adjacentId([], 1, 1)).toBeNull()
    expect(adjacentId(list, 99, 1)).toBeNull()
  })
})

describe('randomId', () => {
  it('son gösterilenleri ve açık olanı elemeden seçmez', () => {
    // 1 açık, 2 yakın geçmişte → geriye yalnızca 3 kalır
    expect(randomId(list, [2], 1, () => 0)).toBe(3)
    expect(randomId(list, [2], 1, () => 0.99)).toBe(3)
  })

  it('her şey elenirse açık olan dışındakilerden seçer', () => {
    const picked = randomId(list, [1, 2, 3], 1, () => 0)
    expect(picked).not.toBeNull()
    expect(picked).not.toBe(1)
  })

  it('tek video varsa onu döndürür', () => {
    expect(randomId([{ id: 7 }], [7], 7, () => 0)).toBe(7)
  })

  it('liste boşsa null döner', () => {
    expect(randomId([], [], null, () => 0)).toBeNull()
  })
})
