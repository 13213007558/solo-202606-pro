const readline = require('readline');

const originalQuestion = readline.Interface.prototype.question;
readline.Interface.prototype.question = function(prompt, callback) {
    if (prompt.includes('Ready to start')) {
        console.log(prompt + 'y');
        callback('y');
    } else if (prompt.includes('Press Enter')) {
        console.log(prompt);
        callback('');
        this.close();
    } else {
        originalQuestion.call(this, prompt, callback);
    }
};

require('./run.js');
