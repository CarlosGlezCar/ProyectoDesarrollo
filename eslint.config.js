const js = require('@eslint/js');

module.exports = [
    {
        ignores: ['node_modules/**'],
        languageOptions: {
            globals: {
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'off'
        }
    },
    {
        ...js.configs.recommended,
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            globals: {
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'off'
        }
    }
];