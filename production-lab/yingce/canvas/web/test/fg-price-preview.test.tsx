import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FGPricePreview } from '../src/components/fg-price-preview';
import { createModelChannel, defaultConfig } from '../src/stores/use-config-store';

test('managed prices remain visible when public channel names hide the provider', () => {
  for (const mode of ['text', 'image', 'video'] as const) {
    const channel = createModelChannel({ id: 'CHANNEL_000001', name: '系统模型', scope: 'system', models: ['qa-model'] });
    const config = { ...defaultConfig, channels: [channel] };
    const html = renderToStaticMarkup(<FGPricePreview config={config} model="CHANNEL_000001::qa-model" mode={mode} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('人民币价格');
  }
});

test('personal channels do not show a company price quote', () => {
  const channel = createModelChannel({ id: 'personal', name: 'WeToken 自定义', scope: 'user', models: ['qa-model'] });
  const config = { ...defaultConfig, channels: [channel] };
  expect(renderToStaticMarkup(<FGPricePreview config={config} model="personal::qa-model" mode="image" />)).toBe('');
});
