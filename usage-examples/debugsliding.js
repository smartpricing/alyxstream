import {
  Task,
  StorageKind,
  MakeStorage
} from '../index.js'


async function run () {
  	const storage = MakeStorage(StorageKind.Redis, null, 'debugslide9')

  	const t = await Task()
	.withDefaultKey()
	.withEventTime(x => new Date(x.date))
	.slidingWindowTime(storage, 2000, 500)
	.fn(x => {
		console.log(new Date(), '#>', x[0].id, x[x.length - 1].id, x.length)
	})	

	let id = 0
  	while (true) {
  		await t.inject({
  			id: id,
  			date: new Date()
  		})
  		id += 1
  		await new Promise(resolve => setTimeout(resolve, 100))
  	}	
}

run()