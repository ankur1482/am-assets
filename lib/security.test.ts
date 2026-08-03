import {describe,expect,it} from 'vitest';
import {escapeHtml,safeJsonForInlineScript} from './security';

describe('HTML output safety',()=>{
  it('neutralizes executable markup and attributes',()=>{
    const output=escapeHtml('<script>alert("x")</script><img src=x onerror=alert(1)>');
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('<img');
    expect(output).toContain('&lt;script&gt;');
  });
  it('prevents script-tag termination in serialized values',()=>{
    expect(safeJsonForInlineScript('</script><script>alert(1)</script>')).not.toContain('</script>');
  });
});
