# cart

This is what I would like to implement.

```evml
eventmodeling

tf 01 scn CartScreen
tf 02 cmd AddItem [[AddItem01]]
tf 03 evt ItemAdded [[ItemAdded]]
tf 06 rmo AllItems { count: 1 }
tf 07 scn CartScreen

data AddItem01 {
  description: 'john'
  image: 'avatar_john'
  price: 20.4
}

data AddItem02 {
  description: 'jack'
  image: 'avatar_jack'
  price: 12.5
}

data ItemAdded {
  description: string
  image: string
  price: number
}
```
