import { describe, it, expect } from 'vitest'
import { validateRiotId, validateSummonerSearch } from '@/schemas'

describe('Validación de Riot ID', () => {
  it('debería validar un Riot ID correcto', () => {
    const result = validateRiotId('PlayerName#LAN')
    expect(result).not.toBeNull()
    expect(result?.gameName).toBe('PlayerName')
    expect(result?.tagLine).toBe('LAN')
  })

  it('debería rechazar Riot ID sin #', () => {
    const result = validateRiotId('PlayerNameLAN')
    expect(result).toBeNull()
  })

  it('debería rechazar Riot ID con tag muy largo', () => {
    const result = validateRiotId('Player#TOOLONG')
    expect(result).toBeNull()
  })

  it('debería rechazar Riot ID vacío', () => {
    const result = validateRiotId('')
    expect(result).toBeNull()
  })
})

describe('Validación de búsqueda de invocador', () => {
  it('debería validar búsqueda correcta', () => {
    const result = validateSummonerSearch('Player', 'LAN', 'la1')
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Player')
    expect(result?.tag).toBe('LAN')
    expect(result?.region).toBe('la1')
  })

  it('debería rechazar nombre vacío', () => {
    const result = validateSummonerSearch('', 'LAN', 'la1')
    expect(result).toBeNull()
  })

  it('debería rechazar tag muy corto', () => {
    const result = validateSummonerSearch('Player', 'L', 'la1')
    expect(result).toBeNull()
  })
})
