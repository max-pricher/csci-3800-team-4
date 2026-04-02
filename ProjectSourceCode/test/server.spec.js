// ********************** Initialize server **********************************

const server = require('../src/index');

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
    // Sample test case given to test / endpoint.
    it('Returns the default welcome message', done => {
        chai
            .request(server)
            .get('/welcome')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.status).to.equals('success');
                assert.strictEqual(res.body.message, 'Welcome!');
                done();
            });
    });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

// Positive Test Case
describe('Testing Register API', () => {
    it('positive : /register', done => {
        chai
            .request(server)
            .post('/register')
            .send({ username: 'LabUser' + Date.now(), password: 'password123' })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.equals('Success');
                done();
            });
    });

    // Negative Test Case
    it('Negative : /register. Checking duplicate user', done => {
        chai
            .request(server)
            .post('/register')
            .send({ username: 'test', password: 'test' })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.message).to.equals('Invalid input');
                done();
            });
    });
});

// Testing Redirect
describe('Testing Redirect', () => {
    it('/test route should redirect to /login', done => {
        chai
            .request(server)
            .get('/test')
            .redirects(0)
            .end((err, res) => {
                expect(res).to.have.status(302); // Now it will find the 302
                expect(res).to.redirectTo(/\/login$/);
                done();
            });
    });
});

//  Testing Render
describe('Testing Render', () => {
    it('/login route should render with an html response', done => {
        chai
            .request(server)
            .get('/login')
            .end((err, res) => {
                res.should.have.status(200);
                res.should.be.html; // Confirms the view engine (Handlebars) worked
                done();
            });
    });
});