import { describe, expect, it } from 'vitest'
import {
  countLine,
  graduationYearLabel,
  groupByGraduationYear,
  ringOrder,
  siteDomain,
  sortByName,
  STANDING_LABELS,
  standingLabel,
  type Member,
} from '../src/lib/member'

function member(slug: string, name: string, graduationYear: number): Member {
  return { slug, name, graduationYear, site: `https://${slug}.dev/`, github: slug }
}

const kevin = member('kevin-tran', 'Kevin Tran', 2023)
const ada = member('ada-okafor', 'Ada Okafor', 2028)
const zoe = member('zoe', 'zoë Adams', 2023)
const bob = member('bob-2', 'Bob Li', 2019)
const bob1 = member('bob', 'Bob Li', 2019)
const aaron = member('a-aron', 'Aaron Diaz', 2023)

/** A Faculty Member, with or without a Graduation Year. */
function faculty(slug: string, name: string, graduationYear?: number): Member {
  const { graduationYear: _, ...rest } = member(slug, name, 0)
  return graduationYear === undefined ? { ...rest, faculty: true } : { ...rest, graduationYear, faculty: true }
}

const grace = faculty('grace', 'Grace Hopper')
const edsger = faculty('edsger', 'édsger Dijkstra')
const rosa = faculty('rosa', 'Rosa Mendez', 2023)

describe('ringOrder', () => {
  it('sorts alphabetically by slug', () => {
    expect(ringOrder([kevin, zoe, ada, bob, bob1, aaron]).map((m) => m.slug)).toEqual([
      'a-aron',
      'ada-okafor',
      'bob',
      'bob-2',
      'kevin-tran',
      'zoe',
    ])
  })

  it('compares slugs by character code, not by locale or name', () => {
    const slugs = ['b', 'a-b', 'a1', 'ab', '2x', 'a']
    expect(ringOrder(slugs.map((slug) => ({ slug }))).map((m) => m.slug)).toEqual([...slugs].sort())
  })

  it('does not change its input', () => {
    const input = [kevin, ada]
    ringOrder(input)
    expect(input).toEqual([kevin, ada])
  })

  it('handles zero and one Member', () => {
    expect(ringOrder([])).toEqual([])
    expect(ringOrder([kevin])).toEqual([kevin])
  })
})

describe('groupByGraduationYear', () => {
  it('groups newest year first, names sorted within a year', () => {
    const groups = groupByGraduationYear([kevin, bob, zoe, ada, aaron, bob1])
    expect(groups.map((g) => [g.graduationYear, g.members.map((m) => m.slug)])).toEqual([
      [2028, ['ada-okafor']],
      [2023, ['a-aron', 'kevin-tran', 'zoe']],
      // Same name: slug breaks the tie, so the order is stable.
      [2019, ['bob', 'bob-2']],
    ])
  })

  it('sorts names ignoring case and accents', () => {
    const [group] = groupByGraduationYear([member('z', 'Zed', 2020), member('e', 'élan', 2020), member('b', 'bea', 2020)])
    expect(group.members.map((m) => m.name)).toEqual(['bea', 'élan', 'Zed'])
  })

  it('puts Faculty with no Graduation Year in a Faculty group, first, names sorted', () => {
    const groups = groupByGraduationYear([kevin, grace, ada, edsger])
    expect(groups.map((g) => [g.graduationYear, g.members.map((m) => m.slug)])).toEqual([
      [undefined, ['edsger', 'grace']],
      [2028, ['ada-okafor']],
      [2023, ['kevin-tran']],
    ])
  })

  it('keeps Faculty with a Graduation Year in their year group only', () => {
    const groups = groupByGraduationYear([kevin, rosa, grace])
    expect(groups.map((g) => [g.graduationYear, g.members.map((m) => m.slug)])).toEqual([
      [undefined, ['grace']],
      [2023, ['kevin-tran', 'rosa']],
    ])
  })

  it('has no Faculty group when every Member has a Graduation Year', () => {
    const groups = groupByGraduationYear([kevin, rosa])
    expect(groups.map((g) => g.graduationYear)).toEqual([2023])
  })

  it('returns no groups for zero Members', () => {
    expect(groupByGraduationYear([])).toEqual([])
  })

  it('does not change its input', () => {
    const input = [kevin, ada]
    groupByGraduationYear(input)
    expect(input).toEqual([kevin, ada])
  })
})

describe('graduationYearLabel', () => {
  it('shows the full year, or Faculty when there is none', () => {
    expect(graduationYearLabel(2019)).toBe('2019')
    expect(graduationYearLabel(undefined)).toBe('Faculty & Staff')
  })
})

describe('countLine', () => {
  it('counts Members and Graduation Years', () => {
    expect(countLine([kevin, ada, zoe])).toBe('3 Members across 2 Graduation Years')
  })

  it('uses the singular for one', () => {
    expect(countLine([kevin])).toBe('1 Member across 1 Graduation Year')
  })

  it('adds "and Faculty & Staff" when the Faculty group exists', () => {
    expect(countLine([kevin, ada, zoe, bob, aaron, grace, edsger])).toBe(
      '7 Members across 3 Graduation Years and Faculty & Staff',
    )
    expect(countLine([kevin, grace])).toBe('2 Members across 1 Graduation Year and Faculty & Staff')
  })

  it('counts Faculty with a Graduation Year in their year, with no Faculty group', () => {
    expect(countLine([kevin, rosa])).toBe('2 Members across 1 Graduation Year')
  })

  it('names only Faculty when no Member has a Graduation Year', () => {
    expect(countLine([grace])).toBe('1 Member in Faculty & Staff')
    expect(countLine([grace, edsger])).toBe('2 Members in Faculty & Staff')
  })
})

describe('sortByName', () => {
  it('sorts every Member by name', () => {
    expect(sortByName([kevin, zoe, ada, aaron]).map((m) => m.name)).toEqual([
      'Aaron Diaz',
      'Ada Okafor',
      'Kevin Tran',
      'zoë Adams',
    ])
  })
})

describe('siteDomain', () => {
  it.each([
    ['https://kevintran.github.io/', 'kevintran.github.io'],
    ['https://kevintran.github.io', 'kevintran.github.io'],
    ['https://7jpierre.github.io/jp-website/', '7jpierre.github.io/jp-website'],
    ['https://maipham.dev/blog/posts', 'maipham.dev/blog/posts'],
    ['https://www.example.com/', 'www.example.com'],
  ])('%s shows as %s', (site, shown) => {
    expect(siteDomain(site)).toBe(shown)
  })
})

describe('Standing labels', () => {
  it.each([
    ['graduated', 'Graduated'],
    ['transferred', 'Transferred'],
    ['attended', 'Attended'],
  ] as const)('%s shows as %s', (status, label) => {
    expect(standingLabel(status)).toBe(label)
    expect(STANDING_LABELS[status]).toBe(label)
  })

  it('has a label for exactly the three Standings', () => {
    expect(Object.keys(STANDING_LABELS).sort()).toEqual(['attended', 'graduated', 'transferred'])
  })
})
