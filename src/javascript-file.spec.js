/* global describe:true, it:true */

// Constants:
const REQUEST_ERROR = 400;

// Test setup:
import { expect, sinon } from '../test-setup';

// Dependencies:
import escodegen from 'escodegen';
import * as esprima from 'esprima';
import path from 'path';
import { TractorError } from 'tractor-error-handler';
import { File, FileStructure, ReferenceManager } from 'tractor-file-structure';
import { JavaScriptFileRefactorer } from './javascript-file-refactorer';

// Under test:
import { JavaScriptFile } from './javascript-file';

describe('tractor-file-javascript: JavaScriptFile:', () => {
    describe('JavaScriptFile constructor:', () => {
        it('should create a new JavaScriptFile', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file');

            let file = new JavaScriptFile(filePath, fileStructure);

            expect(file).to.be.an.instanceof(JavaScriptFile);
        });

        it('should inherit from File', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file');

            let file = new JavaScriptFile(filePath, fileStructure);

            expect(file).to.be.an.instanceof(File);
        });
    });

    describe('JavaScriptFile.read:', () => {
        it('should read the file from disk', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file');

            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'read').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.read()
            .then(() => {
                expect(File.prototype.read).to.have.been.called();
            })
            .finally(() => {
                esprima.parseScript.restore();
                File.prototype.read.restore();
            });
        });

        it('should parse the contents', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file');

            sinon.stub(File.prototype, 'read').resolves('');

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.read()
            .then(() => {
                expect(file.ast).to.deep.equal({
                    body: [],
                    comments: [],
                    sourceType: 'script',
                    type: 'Program'
                });
            })
            .finally(() => {
                File.prototype.read.restore();
            });
        });

        it('should update the references between files', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let file = new JavaScriptFile(path.join(path.sep, 'file-structure', 'directory', 'file'), fileStructure);
            let otherFile = new JavaScriptFile(path.join(path.sep, 'file-structure', 'directory', 'other-file'), fileStructure);

            sinon.stub(File.prototype, 'read').resolves(`var someReference = require('./other-file');`);

            return file.read()
            .then(() => {
                expect(file.references).to.deep.equal([otherFile]);
                expect(otherFile.referencedBy).to.deep.equal([file]);
            })
            .finally(() => {
                File.prototype.read.restore();
            });
        });

        it(`shouldn't clear the references on first load`, () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let file = new JavaScriptFile(path.join(path.sep, 'file-structure', 'directory', 'file'), fileStructure);

            sinon.stub(File.prototype, 'read').resolves(`var someReference = require('./other-file');`);
            sinon.stub(ReferenceManager.prototype, 'clearReferences');

            return file.read()
            .then(() => {
                expect(ReferenceManager.prototype.clearReferences).to.not.have.been.called();
            })
            .finally(() => {
                File.prototype.read.restore();
                ReferenceManager.prototype.clearReferences.restore();
            });
        });

        it('should clear the references on subsequent reads', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let file = new JavaScriptFile(path.join(path.sep, 'file-structure', 'directory', 'file'), fileStructure);

            sinon.stub(File.prototype, 'read').resolves(`var someReference = require('./other-file');`);
            sinon.stub(ReferenceManager.prototype, 'clearReferences');

            file.initialised = true;

            return file.read()
            .then(() => {
                expect(ReferenceManager.prototype.clearReferences).to.have.been.called();
            })
            .finally(() => {
                File.prototype.read.restore();
                ReferenceManager.prototype.clearReferences.restore();
            });
        });

        it('should turn log any errors and create a TractorError', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'read').rejects();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.read()
            .catch((tractorError) => {
                expect(tractorError).to.be.an.instanceof(TractorError);
                expect(tractorError.message).to.equal(`Parsing "${path.join(path.sep, 'file-structure', 'directory', 'file.js')}" failed.`);
                expect(tractorError.status).to.equal(REQUEST_ERROR);
            })
            .finally(() => {
                esprima.parseScript.restore();
                File.prototype.read.restore();
            });
        });
    });

    describe('JavaScriptFile.refactor:', () => {
        it('should refactor a JavaScript file', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(File.prototype, 'refactor').resolves();
            sinon.stub(JavaScriptFile.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.refactor('refactor')
            .then(() => {
                expect(File.prototype.refactor).to.have.been.calledWith('refactor');
            })
            .finally(() => {
                File.prototype.refactor.restore();
                JavaScriptFile.prototype.save.restore();
            });
        });

        it('should call the appropriate action on the JavaScriptFileRefactorer', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(File.prototype, 'refactor').resolves();
            sinon.stub(JavaScriptFile.prototype, 'save').resolves();
            sinon.stub(JavaScriptFileRefactorer, 'identifierChange');

            let file = new JavaScriptFile(filePath, fileStructure);
            let data = {};

            return file.refactor('identifierChange', data)
            .then(() => {
                expect(JavaScriptFileRefactorer.identifierChange).to.have.been.calledWith(file, data);
            })
            .finally(() => {
                File.prototype.refactor.restore();
                JavaScriptFile.prototype.save.restore();
                JavaScriptFileRefactorer.identifierChange.restore();
            });
        });

        it(`should do nothing if the action doesn't exist the JavaScriptFileRefactorer`, done => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(File.prototype, 'refactor').resolves();
            sinon.stub(JavaScriptFile.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);
            let data = {};

            file.refactor('someRefactorAction', data)
            .then(done)
            .catch(done.fail)
            .finally(() => {
                File.prototype.refactor.restore();
                JavaScriptFile.prototype.save.restore();
            });
        });

        it('should save the JavaScript file after it has been refactored', () => {
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(File.prototype, 'refactor').resolves();
            sinon.stub(JavaScriptFile.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure)

            return file.refactor('refactor')
            .then(() => {
                expect(JavaScriptFile.prototype.save).to.have.been.called();
            })
            .finally(() => {
                File.prototype.refactor.restore();
                JavaScriptFile.prototype.save.restore();
            });
        });
    });

    describe('JavaScriptFile.save:', () => {
        it('should save a JavaScript string to disk', () => {
            let javascript = '';
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.save(javascript)
            .then(() => {
                expect(File.prototype.save).to.have.been.called();
            })
            .finally(() => {
                esprima.parseScript.restore();
                File.prototype.save.restore();
            });
        });

        it('should assign the `comments` to `leadingComments`', () => {
            let ast = {
                comments: ['comment']
            };
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(escodegen, 'generate');
            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.save(ast)
            .then(() => {
                expect(ast.leadingComments).to.deep.equal(['comment']);
            })
            .finally(() => {
                escodegen.generate.restore();
                esprima.parseScript.restore();
                File.prototype.save.restore();
            });
        });

        it('should generate JavaScript from the AST', () => {
            let ast = {};
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(escodegen, 'generate');
            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.save(ast)
            .then(() => {
                expect(escodegen.generate).to.have.been.calledWith(ast, { comment: true });
            })
            .finally(() => {
                escodegen.generate.restore();
                esprima.parseScript.restore();
                File.prototype.save.restore();
            });
        });

        it('should rebuild any regular expressions in the AST', () => {
            let ast = {
                comments: [],
                regex: {
                    type: 'Literal',
                    raw: '/regex/'
                }
            };
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(escodegen, 'generate');
            sinon.stub(esprima, 'parseScript');
            sinon.stub(File.prototype, 'save').resolves();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.save(ast)
            .then(() => {
                expect(ast).to.deep.equal({
                    comments: [],
                    leadingComments: [],
                    regex: {
                        type: 'Literal',
                        value: /regex/,
                        raw: '/regex/'
                    }
                });
            })
            .finally(() => {
                escodegen.generate.restore();
                esprima.parseScript.restore();
                File.prototype.save.restore();
            });
        });

        it('should turn log any errors and create a TractorError', () => {
            let ast = {};
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(escodegen, 'generate');
            sinon.stub(File.prototype, 'save').rejects();

            let file = new JavaScriptFile(filePath, fileStructure);

            return file.save(ast)
            .catch((tractorError) => {
                expect(tractorError).to.be.an.instanceof(TractorError);
                expect(tractorError.message).to.equal(`Saving "${path.join(path.sep, 'file-structure', 'directory', 'file.js')}" failed.`);
                expect(tractorError.status).to.equal(REQUEST_ERROR);
            })
            .finally(() => {
                escodegen.generate.restore();
                File.prototype.save.restore();
            });
        });
    });

    describe('JavaScriptFile.serialise:', () => {
        it(`should include the file's AST`, () => {
            let ast = {
                type: 'Program',
                body: [],
                sourceType: 'script'
            };
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            sinon.stub(File.prototype, 'serialise').returns({});

            let file = new JavaScriptFile(filePath, fileStructure);
            file.ast = ast;

            file.serialise();

            expect(file.ast).to.equal(ast);

            File.prototype.serialise.restore();
        });
    });

    describe('JavaScriptFile.toJSON:', () => {
        it('should include the parsed metadata', () => {
            let metadata = {
                name: 'javascrpt file'
            };
            let ast = {
                type: 'Program',
                body: [],
                comments: [{
                    value: JSON.stringify(metadata)
                }],
                sourceType: 'script'
            };
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            let file = new JavaScriptFile(filePath, fileStructure);
            file.ast = ast;

            let json = file.toJSON();

            expect(json.meta).to.deep.equal(metadata);
        });

        it('should handle invalid JSON', () => {
            let ast = {
                type: 'Program',
                body: [],
                comments: [{
                    value: 'Not JSON'
                }],
                sourceType: 'script'
            };
            let fileStructure = new FileStructure(path.join(path.sep, 'file-structure'));
            let filePath = path.join(path.sep, 'file-structure', 'directory', 'file.js');

            let file = new JavaScriptFile(filePath, fileStructure);
            file.ast = ast;

            let json = file.toJSON();

            expect(json.meta).to.deep.equal(null);
        });
    });
});
