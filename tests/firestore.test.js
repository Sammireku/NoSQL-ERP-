const { 
  initializeTestEnvironment, 
  assertSucceeds, 
  assertFails 
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

const PROJECT_ID = 'nosql-erp-project';

describe('Firestore Security Rules Compliance Tests', () => {
  let testEnv;

  before(async () => {
    // Read the actual local firestore.rules file
    const rulesContent = fs.readFileSync(
      path.resolve(__dirname, '../firestore.rules'), 
      'utf8'
    );

    // Initialize the emulator test environment
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    // Teardown test environment gracefully
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear Firestore emulator state between tests
    await testEnv.clearFirestore();
  });

  // 1. Authenticated 'Sales' role permission test cases
  describe('CRM Opportunities (Sales Persona Custom Claims)', () => {
    
    it('allows a user with a sales custom claim to CREATE an opportunity', async () => {
      const salesContext = testEnv.authenticatedContext('sales_user_123', {
        role: 'sales',
        email: 'david.carter@erpcorp.com'
      });
      const db = salesContext.firestore();

      const docRef = doc(db, 'opportunities/opp_deal_99');
      
      await assertSucceeds(
        setDoc(docRef, {
          title: 'Enterprise Server Contract',
          company: 'Acme Corp',
          value: 125000,
          kanban_stage: 'Proposal',
          daysInStage: 2,
          createdAt: new Date().toISOString()
        })
      );
    });

    it('allows a user with a sales custom claim to update fields on an active opportunity (e.g., stage to "Proposal")', async () => {
      // Setup initial opportunity in the DB as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'opportunities/opp_deal_99'), {
          title: 'Enterprise Server Contract',
          company: 'Acme Corp',
          value: 125000,
          kanban_stage: 'Lead',
          daysInStage: 1
        });
      });

      const salesContext = testEnv.authenticatedContext('sales_user_123', {
        role: 'sales',
        email: 'david.carter@erpcorp.com'
      });
      const db = salesContext.firestore();

      const docRef = doc(db, 'opportunities/opp_deal_99');

      // Attempt non-Closed state upgrade (Should succeed)
      await assertSucceeds(
        updateDoc(docRef, {
          kanban_stage: 'Proposal'
        })
      );
    });

    it('denies a user with a sales custom claim when updating kanban_stage to "Closed"', async () => {
      // Setup initial opportunity
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'opportunities/opp_deal_99'), {
          title: 'Enterprise Server Contract',
          company: 'Acme Corp',
          value: 125000,
          kanban_stage: 'Proposal',
          daysInStage: 3
        });
      });

      const salesContext = testEnv.authenticatedContext('sales_user_123', {
        role: 'sales',
        email: 'david.carter@erpcorp.com'
      });
      const db = salesContext.firestore();

      const docRef = doc(db, 'opportunities/opp_deal_99');

      // Attempt transition of kanban_stage to Closed (Should be blocked by Rules)
      await assertFails(
        updateDoc(docRef, {
          kanban_stage: 'Closed'
        })
      );
    });

  });

  // 2. Authenticated 'Manager' role permission test cases
  describe('CRM Opportunities (Manager Persona Custom Claims)', () => {

    it('allows a manager custom claim to successfully transition kanban_stage to "Closed"', async () => {
      // Setup initial opportunity
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'opportunities/opp_deal_99'), {
          title: 'Enterprise Server Contract',
          company: 'Acme Corp',
          value: 125000,
          kanban_stage: 'Proposal',
          daysInStage: 5
        });
      });

      const managerContext = testEnv.authenticatedContext('manager_user_456', {
        role: 'manager',
        email: 'sarah.jenkins@erpcorp.com'
      });
      const db = managerContext.firestore();

      const docRef = doc(db, 'opportunities/opp_deal_99');

      // Attempt transition to Closed (Should be allowed for managers)
      await assertSucceeds(
        updateDoc(docRef, {
          kanban_stage: 'Closed'
        })
      );
    });

  });

});
