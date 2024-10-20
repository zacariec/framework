module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'airbnb-base',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
    rules: {
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                js: 'never',
                jsx: 'never',
                ts: 'never',
                tsx: 'never',
            },
        ],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'import/prefer-default-export': 'off',
        'import/order': 'off',
        
    }
}