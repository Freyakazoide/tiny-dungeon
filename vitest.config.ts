import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Os testes de engine antigos assumem waves de tamanho fixo: os reforços aleatórios ficam desligados por padrão
        // e cada teste de waves os liga explicitamente (WAVE_CONFIG.enabled = true).
        setupFiles: ['./src/test-setup.ts'],
    },
});
