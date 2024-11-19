const standardAPI = async (url) => {
  let protocol = 'https://'

  let test1 = url.toLowerCase();

  let test2
  if(!test1.startsWith('http')){
    test1 = protocol.concat(test1)
  }
  
  test2 = new URL(test1)
  
  test1 = test2.href.replace('www.', '')
  test1 = test1.split('?')[0]
  if(!test1.endsWith('/')){
    test1 = test1 + '/'
  }
  
  return test1;
}

module.exports = { standardAPI };
