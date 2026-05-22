//在后续的wps版本中，wps的所有枚举值都会通过wps.Enum对象来自动支持，现阶段先人工定义
var WPS_Enum = {
  msoCTPDockPositionLeft: 0,
  msoCTPDockPositionRight: 2
}

function GetUrlPath() {
  // 在本地网页的情况下获取路径
  if (window.location.protocol === 'file:') {
    const path = window.location.href;
    // 删除文件名以获取根路径
    return path.substring(0, path.lastIndexOf('/'));
  }

  // 在非本地网页的情况下获取完整路径（包含路径部分）
  const { protocol, hostname, port, pathname } = window.location;
  const portPart = port ? `:${port}` : '';
  
  // 获取路径部分，但去掉 index.html 或文件名
  let basePath = pathname;
  if (basePath.includes('/index.html')) {
    basePath = basePath.replace('/index.html', '');
  } else if (basePath.includes('.')) {
    // 如果路径包含文件扩展名，去掉文件名
    basePath = basePath.substring(0, basePath.lastIndexOf('/'));
  }
  
  // 确保路径以 / 结尾
  if (basePath && !basePath.endsWith('/')) {
    basePath = basePath + '/';
  }
  
  return `${protocol}//${hostname}${portPart}${basePath}`;
}

function GetRouterHash() {
  if (window.location.protocol === 'file:') {
    return '';
  }

  return '/#'
}

export default {
  WPS_Enum,
  GetUrlPath,
  GetRouterHash
}
