import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock simple de componente
const MockComponent = {
  template: '<div>Test</div>'
}

describe('Setup de tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Vitest funciona correctamente', () => {
    expect(true).toBe(true)
  })

  it('puede montar componentes Vue', () => {
    const wrapper = mount(MockComponent)
    expect(wrapper.text()).toBe('Test')
  })

  it('puede usar mocks', () => {
    const mockFn = vi.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})
