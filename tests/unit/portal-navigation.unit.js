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
  const views = ['dashboard', 'orders', 'listing', 'admin', 'settings', 'community', 'tutorial'];
  const navigationItems = views.map((view) => createElement({
    view,
    title: view === 'orders' ? 'Order' : `${view[0].toUpperCase()}${view.slice(1)}`
  }));
  const viewPanels = views.map((viewPanel) => createElement({ viewPanel }));
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
      ok: true,
      status: 200,
      json: async () => url === '/config' ? config : { status: 'ok' }
    })
  };
  const source = fs.readFileSync(path.join(__dirname, '../../src/public/app.js'), 'utf8');

  vm.runInNewContext(source, context);
  await new Promise((resolve) => setImmediate(resolve));

  for (const [index, item] of navigationItems.entries()) {
    item.listeners.get('click')();

    assert.equal(item.attributes.get('aria-current'), 'page');
    assert.equal(item.classList.contains('is-active'), true);
    assert.equal(navigationItems.filter((candidate) =>
      candidate.attributes.get('aria-current') === 'page').length, 1);
    assert.equal(navigationItems.filter((candidate) =>
      candidate.classList.contains('is-active')).length, 1);
    assert.deepEqual(viewPanels.map((panel) => panel.hidden), views.map((_, panelIndex) => panelIndex !== index));
    assert.equal(elements.get('page-title').textContent, item.dataset.title);
    assert.equal(document.title, `Portal Web | ${item.dataset.title}`);
  }

  assert.equal(context.setActiveView('unknown'), false);
  assert.equal(document.title, 'Portal Web | Tutorial');
});
