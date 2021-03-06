import { expect } from 'chai';
import sinon from 'sinon';
import { restrictToOwner } from '../src/index';

const app = {
  get () { return {}; }
};

let MockData;
let MockData2;
let MockService;
let MockService2;

describe('restrictToOwner', () => {
  beforeEach(() => {
    MockData = {
      userId: '1',
      text: 'hey'
    };
    MockData2 = {
      userId: ['1'],
      text: 'hey'
    };
    MockService = {
      get: sinon.stub().returns(Promise.resolve(MockData))
    };
    MockService2 = {
      get: sinon.stub().returns(Promise.resolve(MockData2))
    };
  });

  describe('when not called as a before hook', () => {
    it('throws an error', () => {
      let hook = {
        type: 'after',
        method: 'get'
      };

      try {
        restrictToOwner()(hook);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe('when not called with an id', () => {
    it('throws an error', () => {
      let hook = {
        type: 'before',
        method: 'get'
      };

      try {
        restrictToOwner()(hook);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe('when provider does not exist', () => {
    it('does not do anything', () => {
      let hook = {
        id: '1',
        type: 'before',
        method: 'get',
        params: {},
        app
      };

      try {
        var returnedHook = restrictToOwner()(hook);
        expect(hook).to.deep.equal(returnedHook);
      } catch (error) {
        // It should never get here
        expect(true).to.equal(false);
      }
    });
  });

  describe('when user does not exist', () => {
    it('throws a not authenticated error', () => {
      let hook = {
        id: '1',
        type: 'before',
        method: 'get',
        params: {
          provider: 'rest'
        },
        app
      };

      try {
        restrictToOwner()(hook);
      } catch (error) {
        expect(error.code).to.equal(401);
      }
    });
  });

  describe('when user exists', () => {
    let hook;

    beforeEach(() => {
      hook = {
        id: '1',
        type: 'before',
        method: 'get',
        params: {
          provider: 'rest',
          user: { _id: '1' }
        },
        app,
        service: MockService
      };
    });

    describe('when method is find', () => {
      it('when query is empty, uses queryWithCurrentUser and uses ownerField (#7)', () => {
        hook.method = 'find';
        delete hook.id;

        restrictToOwner({
          ownerField: 'user'
        })(hook);

        expect(hook.params.query).to.deep.equal({
          user: '1'
        });
      });

      it('when query is empty, merges queryWithCurrentUser', () => {
        hook.method = 'find';
        hook.params.query = { name: 'David' };
        delete hook.id;

        restrictToOwner()(hook);

        expect(hook.params.query).to.deep.equal({
          name: 'David',
          userId: '1'
        });
      });
    });

    describe('when is is `null`', () => {
      it('when query is empty, uses queryWithCurrentUser', () => {
        hook.id = null;

        restrictToOwner()(hook);

        expect(hook.params.query).to.deep.equal({
          userId: '1'
        });
      });

      it('when query is empty, merges queryWithCurrentUser', () => {
        hook.params.query = { name: 'David' };
        hook.id = null;

        restrictToOwner()(hook);

        expect(hook.params.query).to.deep.equal({
          name: 'David',
          userId: '1'
        });
      });
    });

    describe('when user is missing idField', () => {
      it('throws an error', () => {
        hook.params.user = {};

        try {
          restrictToOwner()(hook);
        } catch (error) {
          expect(error).to.not.equal(undefined);
        }
      });
    });

    describe('when resource is missing owner id', () => {
      it('returns a Forbidden error', done => {
        let fn = restrictToOwner({ ownerField: 'user' });

        fn.call(MockService, hook).then(done).catch(error => {
          expect(error.code).to.equal(403);
          done();
        });
      });
    });

    describe('when user is not an owner', () => {
      it('returns a Forbidden error', done => {
        hook.params.user._id = '2';
        let fn = restrictToOwner();

        fn.call(MockService, hook).then(done).catch(error => {
          expect(error.code).to.equal(403);
          done();
        });
      });
    });

    describe('when an empty array is passed', () => {
      it('throws an error', () => {
        hook.userId = [];

        try {
          restrictToOwner()(hook);
        } catch (error) {
          expect(error).to.not.equal(undefined);
        }
      });
    });

    describe('when user does not own the resource and idField is an array', () => {
      it('returns a Forbidden error', done => {
        hook.userId = ['1'];
        hook.params.user._id = '2';
        let fn = restrictToOwner();

        fn.call(MockService2, hook).then(done).catch(error => {
          expect(error.code).to.equal(403);
          done();
        });
      });
    });

    describe('when user owns the resource and idField is an array', () => {
      it('does nothing', done => {
        hook.userId = ['1'];

        let fn = restrictToOwner();

        fn.call(MockService2, hook).then(returnedHook => {
          expect(returnedHook).to.deep.equal(hook);
          done();
        }).catch(done);
      });
    });

    describe('when user owns the resource', () => {
      it('does nothing', done => {
        let fn = restrictToOwner();

        fn.call(MockService, hook).then(returnedHook => {
          expect(returnedHook).to.deep.equal(hook);
          done();
        }).catch(done);
      });
    });
  });
});
