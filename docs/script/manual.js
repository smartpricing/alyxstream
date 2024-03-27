(function () {
  const matched = location.pathname.match(/\/(manual\/.*\.html)$/)
  if (!matched) return

  const currentName = matched[1]
  const cssClass = '.navigation .manual-toc li[data-link="' + currentName + '"]'
  let styleText = cssClass + '{ display: block; }\n'
  styleText += cssClass + '.indent-h1 a { color: #039BE5 }'
  const style = document.createElement('style')
  style.textContent = styleText
  document.querySelector('head').appendChild(style)
})()
