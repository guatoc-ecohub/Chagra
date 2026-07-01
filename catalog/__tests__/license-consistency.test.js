import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('License consistency across catalog files', () => {
  const EXPECTED_LICENSE = 'CC-BY-NC-SA-4.0'

  it('CITATION.cff should use CC-BY-NC-SA-4.0 in message field', () => {
    const citationPath = resolve(__dirname, '..', 'CITATION.cff')
    const citation = readFileSync(citationPath, 'utf-8')
    
    // Check message field
    const messageMatch = citation.match(/^message:\s*"([^"]+)"/m)
    expect(messageMatch).toBeTruthy()
    
    if (messageMatch) {
      const message = messageMatch[1]
      expect(message).toContain('CC-BY-NC-SA-4.0')
      expect(message).not.toContain('CC-BY-SA-4.0')
    }
  })

  it('CITATION.cff should use CC-BY-NC-SA-4.0 in license field', () => {
    const citationPath = resolve(__dirname, '..', 'CITATION.cff')
    const citation = readFileSync(citationPath, 'utf-8')
    
    // Check license field
    const licenseMatch = citation.match(/^license:\s*(.+)$/m)
    expect(licenseMatch).toBeTruthy()
    
    if (licenseMatch) {
      const license = licenseMatch[1].trim()
      expect(license).toBe(EXPECTED_LICENSE)
    }
  })

  it('.zenodo.json should use CC-BY-NC-SA 4.0 in description', () => {
    const zenodoPath = resolve(__dirname, '..', '.zenodo.json')
    const zenodo = JSON.parse(readFileSync(zenodoPath, 'utf-8'))
    
    expect(zenodo.description).toBeDefined()
    expect(zenodo.description).toContain('CC-BY-NC-SA')
    expect(zenodo.description).not.toContain('CC-BY-SA 4.0')
  })

  it('.zenodo.json should use CC-BY-NC-SA-4.0 in license field', () => {
    const zenodoPath = resolve(__dirname, '..', '.zenodo.json')
    const zenodo = JSON.parse(readFileSync(zenodoPath, 'utf-8'))
    
    expect(zenodo.license).toBeDefined()
    expect(zenodo.license).toBe(EXPECTED_LICENSE)
  })

  it('LICENSE.md should reference CC BY-NC-SA 4.0', () => {
    const licensePath = resolve(__dirname, '..', 'LICENSE.md')
    const license = readFileSync(licensePath, 'utf-8')

    // Should contain the correct license (with or without hyphens)
    expect(license).toMatch(/CC[- ]BY[- ]NC[- ]SA[- ]4\.0/i)
    expect(license).toContain('Attribution-NonCommercial-ShareAlike 4.0')

    // File should start with CC BY-NC-SA 4.0 (current license, not historical)
    const firstLine = license.split('\n')[0]
    expect(firstLine).toMatch(/CC[- ]BY[- ]NC[- ]SA[- ]4\.0/i)
  })

  it('README.md should reference CC BY-NC-SA 4.0', () => {
    const readmePath = resolve(__dirname, '..', 'README.md')
    const readme = readFileSync(readmePath, 'utf-8')

    // Should contain the correct license (with or without hyphens)
    expect(readme).toMatch(/CC[- ]BY[- ]NC[- ]SA[- ]4\.0/i)

    // Should not mention only CC-BY-SA without NC as the current license
    // (historical migration references are OK)
    const lines = readme.split('\n')
    const licenseLine = lines.find(line => line.includes('Licencia:'))
    expect(licenseLine).toBeDefined()
    expect(licenseLine).toMatch(/CC[- ]BY[- ]NC[- ]SA[- ]4\.0/i)
  })

  it('All catalog files should have consistent license references', () => {
    const citationPath = resolve(__dirname, '..', 'CITATION.cff')
    const zenodoPath = resolve(__dirname, '..', '.zenodo.json')
    const licensePath = resolve(__dirname, '..', 'LICENSE.md')
    
    const citation = readFileSync(citationPath, 'utf-8')
    const zenodo = JSON.parse(readFileSync(zenodoPath, 'utf-8'))
    const license = readFileSync(licensePath, 'utf-8')
    
    // Extract license from each file
    const citationLicense = citation.match(/^license:\s*(.+)$/m)?.[1]?.trim()
    const zenodoLicense = zenodo.license
    
    // All should be CC-BY-NC-SA-4.0 (with specific format for citation/zenodo)
    expect(citationLicense).toBe(EXPECTED_LICENSE)
    expect(zenodoLicense).toBe(EXPECTED_LICENSE)

    // LICENSE.md should contain the license in any format (with spaces or hyphens)
    expect(license).toMatch(/CC[- ]BY[- ]NC[- ]SA[- ]4\.0/i)

    // Citation files should not reference old license (they represent current state)
    expect(citation).not.toMatch(/CC[- ]BY[- ]SA[- ]4\.0/i)
    expect(JSON.stringify(zenodo)).not.toMatch(/CC[- ]BY[- ]SA[- ]4\.0/i)
  })
})
