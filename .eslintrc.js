module.exports = {
    root: true,
    extends: [
        '@maier/base',
        '@maier/node'
    ],
    rules: {
        'max-len': [
            'error',
            {
                code                   : 100,
                tabWidth               : 4,
                ignoreComments         : true,
                ignoreTrailingComments : true,
                ignoreUrls             : true,
                ignoreStrings          : true,
                ignoreTemplateLiterals : true,
                ignoreRegExpLiterals   : true
            }
        ],
        'no-underscore-dangle': 'off',
        'prefer-destructuring': 'off'
    }
};
