const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement(dataset = {}) {
  const attributes = new Map();
  const listeners = new Map();
  const classes = new Set();
  const children = [];

  return {
    dataset,
    attributes,
    listeners,
    children,
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    appendChild(child) {
      children.push(child);
    },
    scrollIntoView() {},
    set innerHTML(value) {
      if (value === '') children.length = 0;
    },
    textContent: '',
    hidden: false
  };
}

test('navigation state updates the selected item, visible panel, and page title', async () => {
  const navigationItems = [
    createElement({ view: 'dashboard', title: 'Dashboard' }),
    createElement({ view: 'orders', title: 'Orders' }),
    createElement({ view: 'admin', title: 'Admin' })
  ];
  const viewPanels = [
    createElement({ viewPanel: 'dashboard' }),
    createElement({ viewPanel: 'orders' }),
    createElement({ viewPanel: 'admin' })
  ];
  const elements = new Map();
  const document = {
    title: '',
    querySelectorAll(selector) {
      return selector === '.nav-link' ? navigationItems : viewPanels;
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    createElement() {
      return createElement();
    }
  };
  const config = {
    environmentName: 'unit-test',
    buildSha: 'test',
    apiGatewayUrl: 'http://localhost',
    repoLinks: {
      portal: '', gateway: '', orders: '', contracts: '',
      scenarioFeature: '', scenarioIncident: '', scenarioRollback: ''
    }
  };
  const context = {
    document,
    FormData: class {},
    fetch: async (url) => ({
      json: async () => url === '/config' ? config : { status: 'ok' }
    })
  };
  const source = fs.readFileSync(path.join(__dirname, '../../src/public/app.js'), 'utf8');

  vm.runInNewContext(source, context);
  navigationItems[0].listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(navigationItems[0].attributes.get('aria-current'), 'page');
  assert.equal(navigationItems[0].classList.contains('is-active'), true);
  assert.equal(navigationItems[1].attributes.has('aria-current'), false);
  assert.deepEqual(viewPanels.map((panel) => panel.hidden), [false, true, true]);
  assert.equal(elements.get('page-title').textContent, 'Dashboard');
  assert.equal(document.title, 'Portal Web | Dashboard');

  assert.equal(context.setActiveView('unknown'), false);
  assert.equal(document.title, 'Portal Web | Dashboard');
});
