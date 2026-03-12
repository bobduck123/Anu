(function(global){
  function mount(selector, options){
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if(!el){ return; }
    var widget = options && options.widget ? options.widget : 'benefits';
    var token = options && options.token ? options.token : '';
    var partnerUserId = options && options.partnerUserId ? options.partnerUserId : '';
    var iframe = document.createElement('iframe');
    var params = new URLSearchParams();
    params.set('widget', widget);
    if (token){ params.set('token', token); }
    if (partnerUserId){ params.set('partner_user_id', partnerUserId); }
    iframe.src = '/api/node/widget/shell?' + params.toString();
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.minHeight = '180px';
    el.appendChild(iframe);
  }
  global.FederationWidget = { mount: mount };
})(window);
