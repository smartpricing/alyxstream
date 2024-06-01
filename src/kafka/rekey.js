'use strict'

export default function (kafkaSource, rekeyFunction, kafkaSink, sinkTopic, sinkDataFunction) {
  kafkaSource.stream().subscribe((s) => {
    s.key = rekeyFunction(s)
    const message = sinkDataFunction(s)
    if (message == null) {
      return
    }
    const data = [message]
    kafkaSink.send({
      topic: sinkTopic,
      messages: data
    })
  })
}
