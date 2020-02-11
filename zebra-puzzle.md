color, nation, pet, drink, movie genre

puzzle(houses)
    exists(house(red, england, _, _, _), houses)
    exists(house(_, spain, dog, _, _), houses)
    exists(house(green, _, _, coffee, _), houses)
    exists(house(_, ukraine, _, tea, _), houses)
    rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), houses)
    exists(house(_, _, snails, _, fantasy), houses)
    exists(house(yellow, _, _, _, sci-fi), houses)
    middle(house(_, _, _, milk, _), houses)
    first(house(_, norweigh, _, _, _), houses)
    nextTo(house(_, _, _, _, romance), house(_, _, fox, _, _), houses)
    nextTo(house(_, _, _, _, sci-fi), house(_, _, horses, _, _), houses)
    exists(house(_, _, _, orange juice, comedy), houses)
    exists(house(_, japan, _, _, action), houses)
    exists(house(_, norweigh, _, _, _), houses)

exists(a, list(a, _, _, _, _))
exists(a, list(_, a, _, _, _))
exists(a, list(_, _, a, _, _))
exists(a, list(_, _, _, a, _))
exists(a, list(_, _, _, _, a))

rightOf(a, b, list(b, a, _, _, _))
rightOf(a, b, list(_, b, a, _, _))
rightOf(a, b, list(_, _, b, a, _))
rightOf(a, b, list(_, _, _, b, a))

nextTo(a, b, list(b, a, _, _, _))
nextTo(a, b, list(_, b, a, _, _))
nextTo(a, b, list(_, _, b, a, _))
nextTo(a, b, list(_, _, _, b, a))
nextTo(a, b, list(a, b, _, _, _))
nextTo(a, b, list(_, a, b, _, _))
nextTo(a, b, list(_, _, a, b, _))
nextTo(a, b, list(_, _, _, a, b))

middle(a, list(_, _, a, _, _))

first(a, list(a, _, _, _, _))

