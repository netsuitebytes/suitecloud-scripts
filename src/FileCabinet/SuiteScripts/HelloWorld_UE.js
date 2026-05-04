/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Example User Event Script — replace this with your own logic.
 * Deploy via SuiteCloud CLI: suitecloud project:deploy
 */
define(['N/log'], (log) => {

    /**
     * Fires before a record is loaded in the UI or via API.
     * @param {Object} context
     * @param {Record} context.newRecord
     * @param {string} context.type - UserEventType: CREATE, EDIT, VIEW, COPY, etc.
     * @param {Form}   context.form
     */
    const beforeLoad = (context) => {
        log.debug({
            title: 'beforeLoad',
            details: `type=${context.type} | recordType=${context.newRecord.type} | id=${context.newRecord.id}`
        });
    };

    /**
     * Fires before a record is saved.
     * @param {Object} context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type - UserEventType: CREATE, EDIT, DELETE, etc.
     */
    const beforeSubmit = (context) => {
        log.debug({
            title: 'beforeSubmit',
            details: `type=${context.type} | recordType=${context.newRecord.type}`
        });
    };

    /**
     * Fires after a record is saved.
     * @param {Object} context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type
     */
    const afterSubmit = (context) => {
        log.debug({
            title: 'afterSubmit',
            details: `type=${context.type} | recordType=${context.newRecord.type} | id=${context.newRecord.id}`
        });
    };

    return { beforeLoad, beforeSubmit, afterSubmit };
});
